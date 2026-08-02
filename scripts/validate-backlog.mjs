import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backlogUrl = new URL("../docs/backlog/OPEN_TASKS.md", import.meta.url);
const taskHeadingPattern = /^## (BF-[A-Z0-9]+-\d{3}) - (.+)$/u;
const allowedStatuses = new Set(["OPEN", "IN_PROGRESS", "BLOCKED", "DONE"]);
const requiredFields = [
  "Öncelik ve durum",
  "Kök neden ve kanıt",
  "Kabul kriteri",
  "Doğrulama kapısı",
  "Sonraki adım",
  "Son güncelleme",
];

function parseTasks(text) {
  const lines = text.split(/\r?\n/u);
  const tasks = [];
  let current = null;

  for (const [index, line] of lines.entries()) {
    const match = line.match(taskHeadingPattern);
    if (match) {
      current = {
        id: match[1],
        title: match[2].trim(),
        line: index + 1,
        fields: new Map(),
      };
      tasks.push(current);
      continue;
    }

    if (!current || !line.startsWith("- ")) continue;
    const separator = line.indexOf(":", 2);
    if (separator === -1) continue;
    const key = line.slice(2, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (requiredFields.includes(key)) {
      current.fields.set(key, { value, line: index + 1 });
    }
  }
  return tasks;
}

export function validateBacklogText(text) {
  const errors = [];
  const contractFragments = [
    "## Kapanış sözleşmesi",
    "`OPEN`",
    "`IN_PROGRESS`",
    "`BLOCKED`",
    "`DONE`",
  ];
  for (const fragment of contractFragments) {
    if (!text.includes(fragment)) errors.push(`Eksik kapanış sözleşmesi parçası: ${fragment}`);
  }

  const tasks = parseTasks(text);
  if (tasks.length === 0) errors.push("Backlog en az bir stabil kimlikli görev içermelidir.");

  const seen = new Map();
  for (const task of tasks) {
    if (seen.has(task.id)) {
      errors.push(`${task.line}. satır: yinelenen görev kimliği ${task.id}; ilk satır ${seen.get(task.id)}.`);
    } else {
      seen.set(task.id, task.line);
    }
    if (!task.title) errors.push(`${task.line}. satır: ${task.id} başlığı boş.`);

    for (const field of requiredFields) {
      const entry = task.fields.get(field);
      if (!entry) {
        errors.push(`${task.line}. satır: ${task.id} için '${field}' alanı eksik.`);
      } else if (!entry.value) {
        errors.push(`${entry.line}. satır: ${task.id} için '${field}' alanı boş.`);
      }
    }

    const stateEntry = task.fields.get("Öncelik ve durum");
    const stateMatch = stateEntry?.value.match(/^(P[0-3]),\s+(OPEN|IN_PROGRESS|BLOCKED|DONE)(?:[.\s(]|$)/u);
    if (!stateMatch) {
      errors.push(`${stateEntry?.line ?? task.line}. satır: ${task.id} öncelik/durum biçimi geçersiz.`);
    } else if (!allowedStatuses.has(stateMatch[2])) {
      errors.push(`${stateEntry.line}. satır: ${task.id} bilinmeyen durum kullanıyor: ${stateMatch[2]}.`);
    }

    const dateEntry = task.fields.get("Son güncelleme");
    if (dateEntry && !/^\d{4}-\d{2}-\d{2}\.$/u.test(dateEntry.value)) {
      errors.push(`${dateEntry.line}. satır: ${task.id} son güncelleme tarihi YYYY-MM-DD. biçiminde olmalıdır.`);
    }

    const nextEntry = task.fields.get("Sonraki adım");
    if (stateMatch && stateMatch[2] !== "DONE" && /^Yok\b/iu.test(nextEntry?.value ?? "")) {
      errors.push(`${nextEntry.line}. satır: açık ${task.id} görevinin doğrulanabilir sonraki adımı olmalıdır.`);
    }
  }
  return errors;
}

export function validateBacklogFile(url = backlogUrl) {
  return validateBacklogText(readFileSync(url, "utf8"));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const errors = validateBacklogFile();
  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
  } else {
    console.log("BookmarkFlow backlog sözleşmesi geçerli.");
  }
}
