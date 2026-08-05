const FOLDER_RAIL_PINNED_STORAGE_KEY = "bfFolderRailPinnedIds";
const { DATA_CONSENT_STORAGE_KEY, DATA_CONSENT_VERSION } = BookmarkFlowConfig;
const { getLanguage, t } = BookmarkFlowI18n;

const elements = {
  consentGate: document.getElementById("maintenanceConsentGate"),
  folderFilter: document.getElementById("folderFilter"),
  folderPickerList: document.getElementById("folderPickerList"),
  groups: document.getElementById("groups"),
  merge: document.getElementById("merge"),
  openPrivacySetup: document.getElementById("openPrivacySetup"),
  pinnedStatus: document.getElementById("pinnedStatus"),
  refresh: document.getElementById("refresh"),
  savePinnedFolders: document.getElementById("savePinnedFolders"),
  status: document.getElementById("status")
};

let duplicateGroups = [];
let selectableFolders = [];
let pinnedFolderIds = new Set();
let isBusy = false;

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && DATA_CONSENT_STORAGE_KEY in changes) {
    window.location.reload();
  }
});
init().catch(handleFatalError);

async function init() {
  elements.openPrivacySetup.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/onboarding.html") });
  });

  const consent = await sendMessage({ type: "BF_GET_CONSENT_STATUS" });
  if (!consent?.ok || !consent.consentGranted) {
    elements.consentGate.hidden = false;
    document.querySelectorAll("input, button, select").forEach((control) => {
      if (control !== elements.openPrivacySetup) {
        control.disabled = true;
      }
    });
    renderStatus(t("dataConsentRequired"), "error");
    return;
  }

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

  await Promise.all([
    loadDuplicateGroups(),
    loadFolderPicker()
  ]);
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve(response));
  });
}

async function requireDataConsent() {
  const localState = await chrome.storage.local.get(DATA_CONSENT_STORAGE_KEY);
  if (localState[DATA_CONSENT_STORAGE_KEY] !== DATA_CONSENT_VERSION) {
    throw new Error(t("dataConsentRequired"));
  }
}

async function loadFolderPicker() {
  await requireDataConsent();
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
    return Number(right.syncing) - Number(left.syncing) || left.title.localeCompare(right.title, getLanguage());
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
    storage.textContent = folder.syncing ? t("googleAccount") : t("thisDevice");

    choice.append(checkbox, copy, storage);
    elements.folderPickerList.append(choice);
  });

  if (!visibleFolders.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = t("noMatchingFolders");
    elements.folderPickerList.append(empty);
  }
}

async function savePinnedFolders() {
  await requireDataConsent();
  elements.savePinnedFolders.disabled = true;
  renderPinnedStatus(t("savingRailSelection"));
  await chrome.storage.local.set({
    [FOLDER_RAIL_PINNED_STORAGE_KEY]: Array.from(pinnedFolderIds)
  });
  elements.savePinnedFolders.disabled = false;
  renderPinnedStatus(t("railSelectionSaved"), "success");
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
  await requireDataConsent();
  setBusy(true);
  renderStatus(t("scanningFolders"));

  const [root] = await chrome.bookmarks.getTree();
  duplicateGroups = findAccountLocalDuplicateGroups(root);
  renderGroups(duplicateGroups);

  if (duplicateGroups.length) {
    renderStatus(t("duplicateGroupsFound", duplicateGroups.length));
  } else {
    renderStatus(t("noDuplicateGroups"), "success");
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
    .sort((left, right) => left.title.localeCompare(right.title, getLanguage()));
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
  return right.totalCount - left.totalCount || left.path.localeCompare(right.path, getLanguage());
}

function compareMergeSources(left, right) {
  return right.pathDepth - left.pathDepth || compareFolderCandidates(left, right);
}

function normalizeFolderTitle(title) {
  return String(title || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase(getLanguage() === "tr" ? "tr-TR" : "en-US");
}

function renderGroups(groups) {
  elements.groups.replaceChildren();

  if (!groups.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = t("noCrossStorageFolders");
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
    checkbox.setAttribute("aria-label", t("selectFolderGroup", group.title));
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
    count.textContent = t("localFolderItemCount", [group.localFolders.length, movingCount]);
    titleRow.append(title, count);

    const paths = document.createElement("div");
    paths.className = "paths";
    appendFolderPaths(paths, t("inGoogleAccount"), group.accountFolders);
    appendFolderPaths(paths, t("onThisDeviceOnly"), group.localFolders);

    body.append(titleRow, paths);

    if (group.accountFolders.length > 1) {
      const targetLabel = document.createElement("label");
      targetLabel.className = "target-label";
      const labelText = document.createElement("span");
      labelText.textContent = t("targetGoogleFolder");
      const select = document.createElement("select");
      group.accountFolders.forEach((folder) => {
        const option = document.createElement("option");
        option.value = folder.id;
        option.textContent = `${folder.path} (${t("itemCount", folder.totalCount)})`;
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
    path.textContent = `${folder.path} (${t("itemCount", folder.totalCount)})`;
    row.append(rowLabel, path);
    container.append(row);
  });
}

async function mergeSelectedGroups() {
  await requireDataConsent();
  const selectedGroups = duplicateGroups.filter((group) => group.selected);
  if (!selectedGroups.length || isBusy) {
    return;
  }

  const movingCount = selectedGroups.reduce((groupTotal, group) => {
    return groupTotal + group.localFolders.reduce((folderTotal, folder) => folderTotal + folder.totalCount, 0);
  }, 0);
  const localFolderCount = selectedGroups.reduce((total, group) => total + group.localFolders.length, 0);
  const approved = window.confirm(t("mergeConfirmation", [movingCount, localFolderCount]));

  if (!approved) {
    return;
  }

  setBusy(true);
  renderStatus(t("mergingFolders"));

  await addPinnedFolderIds(selectedGroups.map((group) => group.targetId));

  const results = [];
  for (const group of selectedGroups) {
    results.push(await mergeFolderGroup(group));
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length) {
    renderStatus(
      t("partialMergeFailed", failed.map((result) => `${result.title}: ${result.error}`).join(" | ")),
      "error"
    );
    setBusy(false);
    return;
  }

  const moved = results.reduce((total, result) => total + result.moved, 0);
  const removed = results.reduce((total, result) => total + result.removed, 0);
  await loadDuplicateGroups();
  renderStatus(t("mergeComplete", [moved, removed]), "success");
}

async function addPinnedFolderIds(folderIds) {
  await requireDataConsent();
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
    await requireDataConsent();
    const [root] = await chrome.bookmarks.getTree();
    const nodesById = indexBookmarkTree(root);
    const target = nodesById.get(group.targetId);

    if (!isValidMergeTarget(target, group.key)) {
      throw new Error(t("mergeTargetMissing"));
    }

    for (const sourceSummary of group.localFolders) {
      await requireDataConsent();
      const currentRoot = (await chrome.bookmarks.getTree())[0];
      const currentNodes = indexBookmarkTree(currentRoot);
      const source = currentNodes.get(sourceSummary.id);
      const currentTarget = currentNodes.get(group.targetId);

      if (!isValidMergeSource(source, group.key) || !isValidMergeTarget(currentTarget, group.key)) {
        throw new Error(t("mergeSourceChanged"));
      }

      if (containsNode(source, currentTarget.id)) {
        throw new Error(t("mergeTargetInsideSource"));
      }

      const children = [...(source.children || [])];
      for (const child of children) {
        await chrome.bookmarks.move(child.id, { parentId: currentTarget.id });
        moved += 1 + (child.url ? 0 : countDescendants(child));
      }

      const remainingChildren = await chrome.bookmarks.getChildren(source.id);
      if (remainingChildren.length !== 0) {
        throw new Error(t("mergeSourceNotEmpty"));
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
