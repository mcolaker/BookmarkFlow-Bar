const FOLDER_RAIL_PINNED_STORAGE_KEY = "bfFolderRailPinnedIds";

const elements = {
  folderFilter: document.getElementById("folderFilter"),
  folderPickerList: document.getElementById("folderPickerList"),
  groups: document.getElementById("groups"),
  merge: document.getElementById("merge"),
  pinnedStatus: document.getElementById("pinnedStatus"),
  refresh: document.getElementById("refresh"),
  savePinnedFolders: document.getElementById("savePinnedFolders"),
  status: document.getElementById("status")
};

let duplicateGroups = [];
let selectableFolders = [];
let pinnedFolderIds = new Set();
let isBusy = false;

elements.refresh.addEventListener("click", () => {
  loadDuplicateGroups().catch(handleFatalError);
});

elements.merge.addEventListener("click", () => {
  mergeSelectedGroups().catch(handleFatalError);
});

elements.folderFilter.addEventListener("input", renderFolderPicker);

elements.savePinnedFolders.addEventListener("click", () => {
  savePinnedFolders().catch(handlePinnedFolderError);
});

Promise.all([
  loadDuplicateGroups(),
  loadFolderPicker()
]).catch(handleFatalError);

async function loadFolderPicker() {
  const [[root], localState] = await Promise.all([
    chrome.bookmarks.getTree(),
    chrome.storage.local.get(FOLDER_RAIL_PINNED_STORAGE_KEY)
  ]);
  selectableFolders = collectSelectableFolders(root);
  pinnedFolderIds = new Set(normalizePinnedFolderIds(localState[FOLDER_RAIL_PINNED_STORAGE_KEY]));
  renderFolderPicker();
}

function collectSelectableFolders(root) {
  const folders = [];

  const visit = (node, ancestors) => {
    if (!node || node.url) {
      return;
    }

    const nextAncestors = node.title ? [...ancestors, node] : ancestors;
    if (node.parentId && !node.folderType && node.title) {
      folders.push({
        id: node.id,
        title: node.title,
        path: nextAncestors.map((item) => item.title).filter(Boolean).join(" / "),
        syncing: node.syncing === true
      });
    }

    (node.children || []).forEach((child) => visit(child, nextAncestors));
  };

  visit(root, []);
  return folders.sort((left, right) => {
    return Number(right.syncing) - Number(left.syncing) || left.title.localeCompare(right.title, "tr");
  });
}

function renderFolderPicker() {
  const query = normalizeFolderTitle(elements.folderFilter.value);
  const visibleFolders = selectableFolders.filter((folder) => {
    if (!query) {
      return true;
    }

    return normalizeFolderTitle(`${folder.title} ${folder.path}`).includes(query);
  });

  elements.folderPickerList.replaceChildren();
  visibleFolders.slice(0, 300).forEach((folder) => {
    const choice = document.createElement("label");
    choice.className = "folder-choice";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = pinnedFolderIds.has(folder.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        pinnedFolderIds.add(folder.id);
      } else {
        pinnedFolderIds.delete(folder.id);
      }
    });

    const copy = document.createElement("span");
    copy.className = "folder-choice-copy";
    const title = document.createElement("span");
    title.className = "folder-choice-title";
    title.textContent = folder.title;
    const path = document.createElement("span");
    path.className = "folder-choice-path";
    path.textContent = folder.path;
    copy.append(title, path);

    const storage = document.createElement("span");
    storage.className = `folder-choice-storage${folder.syncing ? " is-account" : ""}`;
    storage.textContent = folder.syncing ? "Google hesabi" : "Bu cihaz";

    choice.append(checkbox, copy, storage);
    elements.folderPickerList.append(choice);
  });

  if (!visibleFolders.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Bu aramayla eslesen klasor bulunamadi.";
    elements.folderPickerList.append(empty);
  }
}

async function savePinnedFolders() {
  elements.savePinnedFolders.disabled = true;
  renderPinnedStatus("Ray secimi kaydediliyor...");
  await chrome.storage.local.set({
    [FOLDER_RAIL_PINNED_STORAGE_KEY]: Array.from(pinnedFolderIds)
  });
  elements.savePinnedFolders.disabled = false;
  renderPinnedStatus("Kaydedildi. Acik yeni sekme birkac saniye icinde yenilenecek.", "success");
}

function normalizePinnedFolderIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((id) => String(id || "")).filter(Boolean))).slice(0, 200);
}

function renderPinnedStatus(message, kind = "") {
  elements.pinnedStatus.textContent = message;
  elements.pinnedStatus.classList.toggle("is-error", kind === "error");
  elements.pinnedStatus.classList.toggle("is-success", kind === "success");
}

function handlePinnedFolderError(error) {
  elements.savePinnedFolders.disabled = false;
  renderPinnedStatus(error?.message || String(error), "error");
}

async function loadDuplicateGroups() {
  setBusy(true);
  renderStatus("Yer imi klasorleri taraniyor...");

  const [root] = await chrome.bookmarks.getTree();
  duplicateGroups = findAccountLocalDuplicateGroups(root);
  renderGroups(duplicateGroups);

  if (duplicateGroups.length) {
    renderStatus(`${duplicateGroups.length} ayni adli Google hesabi / yerel klasor grubu bulundu.`);
  } else {
    renderStatus("Birlestirilecek ayni adli Google hesabi / yerel klasor bulunamadi.", "success");
  }

  setBusy(false);
  updateMergeButton();
}

function findAccountLocalDuplicateGroups(root) {
  const folders = [];

  walkBookmarkTree(root, [], folders);

  const byTitle = new Map();
  folders.forEach((folder) => {
    const key = normalizeFolderTitle(folder.title);
    if (!key) {
      return;
    }

    const group = byTitle.get(key) || [];
    group.push(folder);
    byTitle.set(key, group);
  });

  return Array.from(byTitle.entries())
    .map(([key, matchingFolders]) => {
      const accountFolders = matchingFolders
        .filter((folder) => folder.syncing === true)
        .sort(compareFolderCandidates);
      const localFolders = matchingFolders
        .filter((folder) => folder.syncing === false)
        .sort(compareMergeSources);
      if (!accountFolders.length || !localFolders.length) {
        return null;
      }

      return {
        key,
        title: matchingFolders[0].title,
        accountFolders,
        localFolders,
        selected: false,
        targetId: accountFolders[0].id
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.title.localeCompare(right.title, "tr"));
}

function walkBookmarkTree(node, ancestors, folders) {
  if (!node) {
    return;
  }

  const isFolder = !node.url;
  const nextAncestors = isFolder && node.title
    ? [...ancestors, node]
    : ancestors;

  if (isFolder && node.parentId && !node.folderType && typeof node.syncing === "boolean") {
    const pathNodes = [...ancestors, node].filter((item) => item.title);
    folders.push({
      id: node.id,
      title: node.title,
      syncing: node.syncing,
      path: pathNodes.map((item) => item.title).join(" / "),
      pathDepth: pathNodes.length,
      directCount: Array.isArray(node.children) ? node.children.length : 0,
      totalCount: countDescendants(node)
    });
  }

  (node.children || []).forEach((child) => {
    walkBookmarkTree(child, nextAncestors, folders);
  });
}

function countDescendants(node) {
  return (node.children || []).reduce((total, child) => {
    return total + 1 + (child.url ? 0 : countDescendants(child));
  }, 0);
}

function compareFolderCandidates(left, right) {
  return right.totalCount - left.totalCount || left.path.localeCompare(right.path, "tr");
}

function compareMergeSources(left, right) {
  return right.pathDepth - left.pathDepth || compareFolderCandidates(left, right);
}

function normalizeFolderTitle(title) {
  return String(title || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

function renderGroups(groups) {
  elements.groups.replaceChildren();

  if (!groups.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Chrome profilinde iki depolama alaninda bulunan ayni adli klasor yok.";
    elements.groups.append(empty);
    return;
  }

  groups.forEach((group) => {
    const card = document.createElement("article");
    card.className = "group";

    const checkbox = document.createElement("input");
    checkbox.className = "group-check";
    checkbox.type = "checkbox";
    checkbox.checked = group.selected;
    checkbox.setAttribute("aria-label", `${group.title} klasorlerini sec`);
    checkbox.addEventListener("change", () => {
      group.selected = checkbox.checked;
      updateMergeButton();
    });

    const body = document.createElement("div");
    body.className = "group-body";

    const titleRow = document.createElement("div");
    titleRow.className = "group-title";
    const title = document.createElement("strong");
    title.textContent = group.title;
    const count = document.createElement("span");
    count.className = "group-count";
    const movingCount = group.localFolders.reduce((total, folder) => total + folder.totalCount, 0);
    count.textContent = `${group.localFolders.length} yerel klasor, ${movingCount} oge`;
    titleRow.append(title, count);

    const paths = document.createElement("div");
    paths.className = "paths";
    appendFolderPaths(paths, "Google hesabinda", group.accountFolders);
    appendFolderPaths(paths, "Yalnizca cihazda", group.localFolders);

    body.append(titleRow, paths);

    if (group.accountFolders.length > 1) {
      const targetLabel = document.createElement("label");
      targetLabel.className = "target-label";
      const labelText = document.createElement("span");
      labelText.textContent = "Hedef Google hesabi klasoru";
      const select = document.createElement("select");
      group.accountFolders.forEach((folder) => {
        const option = document.createElement("option");
        option.value = folder.id;
        option.textContent = `${folder.path} (${folder.totalCount} oge)`;
        option.selected = folder.id === group.targetId;
        select.append(option);
      });
      select.addEventListener("change", () => {
        group.targetId = select.value;
      });
      targetLabel.append(labelText, select);
      body.append(targetLabel);
    }

    card.append(checkbox, body);
    elements.groups.append(card);
  });
}

function appendFolderPaths(container, label, folders) {
  folders.forEach((folder, index) => {
    const row = document.createElement("div");
    row.className = "path-row";
    const rowLabel = document.createElement("span");
    rowLabel.className = "path-label";
    rowLabel.textContent = index === 0 ? label : "";
    const path = document.createElement("span");
    path.textContent = `${folder.path} (${folder.totalCount} oge)`;
    row.append(rowLabel, path);
    container.append(row);
  });
}

async function mergeSelectedGroups() {
  const selectedGroups = duplicateGroups.filter((group) => group.selected);
  if (!selectedGroups.length || isBusy) {
    return;
  }

  const folderNames = selectedGroups.map((group) => group.title).join(", ");
  const movingCount = selectedGroups.reduce((groupTotal, group) => {
    return groupTotal + group.localFolders.reduce((folderTotal, folder) => folderTotal + folder.totalCount, 0);
  }, 0);
  const approved = window.confirm(
    `${folderNames} klasorlerindeki ${movingCount} oge Google hesabindaki ayni adli klasorlere tasinacak. ` +
    "Yer imleri silinmeyecek; bos kalan yerel klasorler kaldirilacak. Devam edilsin mi?"
  );

  if (!approved) {
    return;
  }

  setBusy(true);
  renderStatus("Secilen klasorler birlestiriliyor...");

  await addPinnedFolderIds(selectedGroups.map((group) => group.targetId));

  const results = [];
  for (const group of selectedGroups) {
    results.push(await mergeFolderGroup(group));
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length) {
    renderStatus(
      `Bazi klasorler tamamlanamadi: ${failed.map((result) => `${result.title}: ${result.error}`).join(" | ")}`,
      "error"
    );
    setBusy(false);
    return;
  }

  const moved = results.reduce((total, result) => total + result.moved, 0);
  const removed = results.reduce((total, result) => total + result.removed, 0);
  await loadDuplicateGroups();
  renderStatus(`${moved} oge tasindi; ${removed} bos yerel klasor kaldirildi.`, "success");
}

async function addPinnedFolderIds(folderIds) {
  const localState = await chrome.storage.local.get(FOLDER_RAIL_PINNED_STORAGE_KEY);
  const nextIds = normalizePinnedFolderIds([
    ...normalizePinnedFolderIds(localState[FOLDER_RAIL_PINNED_STORAGE_KEY]),
    ...folderIds
  ]);
  await chrome.storage.local.set({
    [FOLDER_RAIL_PINNED_STORAGE_KEY]: nextIds
  });
}

async function mergeFolderGroup(group) {
  let moved = 0;
  let removed = 0;

  try {
    const [root] = await chrome.bookmarks.getTree();
    const nodesById = indexBookmarkTree(root);
    const target = nodesById.get(group.targetId);

    if (!isValidMergeTarget(target, group.key)) {
      throw new Error("Google hesabi hedef klasoru artik bulunamiyor.");
    }

    for (const sourceSummary of group.localFolders) {
      const currentRoot = (await chrome.bookmarks.getTree())[0];
      const currentNodes = indexBookmarkTree(currentRoot);
      const source = currentNodes.get(sourceSummary.id);
      const currentTarget = currentNodes.get(group.targetId);

      if (!isValidMergeSource(source, group.key) || !isValidMergeTarget(currentTarget, group.key)) {
        throw new Error("Kaynak veya hedef klasor taramadan sonra degisti.");
      }

      if (containsNode(source, currentTarget.id)) {
        throw new Error("Hedef klasor kaynak klasorun icinde olamaz.");
      }

      const children = [...(source.children || [])];
      for (const child of children) {
        await chrome.bookmarks.move(child.id, { parentId: currentTarget.id });
        moved += 1 + (child.url ? 0 : countDescendants(child));
      }

      const remainingChildren = await chrome.bookmarks.getChildren(source.id);
      if (remainingChildren.length !== 0) {
        throw new Error("Yerel klasor bosalmadigi icin kaldirilmadi.");
      }

      await chrome.bookmarks.remove(source.id);
      removed += 1;
    }

    return { ok: true, title: group.title, moved, removed };
  } catch (error) {
    return {
      ok: false,
      title: group.title,
      moved,
      removed,
      error: error?.message || String(error)
    };
  }
}

function indexBookmarkTree(root) {
  const nodes = new Map();
  const visit = (node) => {
    nodes.set(node.id, node);
    (node.children || []).forEach(visit);
  };
  visit(root);
  return nodes;
}

function isValidMergeTarget(node, titleKey) {
  return Boolean(
    node &&
    !node.url &&
    !node.folderType &&
    node.syncing === true &&
    normalizeFolderTitle(node.title) === titleKey
  );
}

function isValidMergeSource(node, titleKey) {
  return Boolean(
    node &&
    !node.url &&
    !node.folderType &&
    node.syncing === false &&
    normalizeFolderTitle(node.title) === titleKey
  );
}

function containsNode(folder, nodeId) {
  return (folder.children || []).some((child) => {
    return child.id === nodeId || (!child.url && containsNode(child, nodeId));
  });
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  elements.refresh.disabled = nextBusy;
  updateMergeButton();
}

function updateMergeButton() {
  elements.merge.disabled = isBusy || !duplicateGroups.some((group) => group.selected);
}

function renderStatus(message, kind = "") {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", kind === "error");
  elements.status.classList.toggle("is-success", kind === "success");
}

function handleFatalError(error) {
  setBusy(false);
  renderStatus(error?.message || String(error), "error");
}
