import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const backgroundSource = readFileSync(join(projectRoot, "src", "background.js"), "utf8");

test("account bookmark bar is the shared display, create, and reorder target", async () => {
  const tree = {
    id: "0",
    title: "",
    children: [
      {
        id: "local-bar",
        title: "Bookmarks bar",
        folderType: "bookmarks-bar",
        syncing: false,
        children: [folder("local-folder", "Local Folder", "local-bar", false)]
      },
      {
        id: "account-bar",
        title: "Bookmarks bar",
        folderType: "bookmarks-bar",
        syncing: true,
        children: [
          bookmark("account-one", "One", "https://one.example", "account-bar", true),
          bookmark("account-two", "Two", "https://two.example", "account-bar", true),
          folder("account-folder", "Account Folder", "account-bar", true, [
            bookmark("account-child", "Child", "https://child.example", "account-folder", true)
          ])
        ]
      }
    ]
  };
  const runtime = createRuntime({ tree });
  const state = plain(await runtime.context.getState());

  assert.equal(state.bookmarkBar.id, "account-bar");
  assert.deepEqual(
    state.folderRailFolders.map((entry) => entry.title),
    ["Account Folder", "Local Folder"]
  );

  await runtime.context.createBookmark({
    title: "Created",
    url: "https://created.example"
  });
  assert.equal(runtime.calls.created.at(-1).parentId, "account-bar");

  await runtime.context.moveTopLevelBookmark({
    sourceId: "account-one",
    targetId: "account-two",
    placement: "after"
  });
  assert.equal(runtime.calls.moved.at(-1).parentId, "account-bar");
});

test("bookmark bar selection falls back to the first local bar", async () => {
  const tree = {
    id: "0",
    title: "",
    children: [
      {
        id: "local-first",
        title: "Bookmarks bar",
        folderType: "bookmarks-bar",
        syncing: false,
        children: []
      },
      {
        id: "local-second",
        title: "Bookmarks bar",
        folderType: "bookmarks-bar",
        syncing: false,
        children: []
      }
    ]
  };
  const runtime = createRuntime({ tree });
  const state = plain(await runtime.context.getState());

  assert.equal(state.bookmarkBar.id, "local-first");
});

test("background folder matching follows the active English or Turkish locale", () => {
  const english = createRuntime({ tree: emptyTree(), language: "en-US" });
  const turkish = createRuntime({ tree: emptyTree(), language: "tr-TR" });

  assert.equal(english.context.normalizeFolderTitle("INSURANCE"), "insurance");
  assert.equal(english.context.normalizeFolderTitle("insurance"), "insurance");
  assert.equal(turkish.context.normalizeFolderTitle("İLETİŞİM"), "iletişim");
  assert.equal(turkish.context.normalizeFolderTitle("IŞIK"), "ışık");
});

test("legacy synced folder colors migrate locally without overwriting newer local colors", async () => {
  const runtime = createRuntime({
    tree: emptyTree(),
    sync: {
      rows: 3,
      folderColors: {
        accountFolder: "#f2c94c",
        sharedFolder: "#4ea1ff",
        invalidFolder: "#000000"
      }
    },
    local: {
      folderColors: {
        sharedFolder: "#41d17d",
        localFolder: "#a78bfa"
      }
    }
  });
  const settings = plain(await runtime.context.getSettings());

  assert.deepEqual(runtime.local.folderColors, {
    accountFolder: "#f2c94c",
    sharedFolder: "#41d17d",
    localFolder: "#a78bfa"
  });
  assert.equal(runtime.local.bfFolderColorsLocalV1, true);
  assert.equal(Object.hasOwn(runtime.sync, "folderColors"), false);
  assert.equal(runtime.sync.rows, 3);
  assert.deepEqual(settings.folderColors, runtime.local.folderColors);
  assert.equal(Object.hasOwn(runtime.context.BookmarkFlowConfig.SYNC_DEFAULT_SETTINGS, "folderColors"), false);
  assert.deepEqual(plain(runtime.context.BookmarkFlowConfig.LOCAL_SETTINGS_DEFAULTS.folderColors), {});
});

test("legacy synced folder colors are retained when the local migration write fails", async () => {
  const runtime = createRuntime({
    tree: emptyTree(),
    sync: {
      folderColors: {
        retainedFolder: "#f2c94c"
      }
    },
    failFolderColorLocalWrite: true
  });

  const settings = plain(await runtime.context.getSettings());

  assert.deepEqual(runtime.sync.folderColors, {
    retainedFolder: "#f2c94c"
  });
  assert.equal(runtime.calls.syncRemoved.includes("folderColors"), false);
  assert.deepEqual(settings.folderColors, {
    retainedFolder: "#f2c94c"
  });
});

test("data access remains fail-closed until the versioned first-run consent is accepted", async () => {
  const runtime = createRuntime({
    tree: emptyTree(),
    consent: false,
    sync: { rows: 4 },
    local: { bfOnboardingSeen: true }
  });

  const deniedState = plain(await runtime.context.routeMessage({ type: "BF_GET_STATE" }, {}));
  const deniedCreate = plain(await runtime.context.routeMessage({
    type: "BF_CREATE_BOOKMARK",
    title: "Blocked",
    url: "https://blocked.example"
  }, {}));

  assert.equal(deniedState.ok, false);
  assert.equal(deniedState.consentRequired, true);
  assert.equal(deniedCreate.ok, false);
  assert.equal(deniedCreate.consentRequired, true);
  assert.equal(runtime.calls.treeReads, 0);
  assert.equal(runtime.calls.created.length, 0);
  assert.equal(runtime.local.bfFolderRailDefaultLeftV1, undefined);
  assert.equal(runtime.local.bfOnboardingSeen, true, "Legacy onboarding state must not grant consent");

  const unauthorizedGrant = plain(await runtime.context.routeMessage({
    type: "BF_SET_DATA_CONSENT",
    consent: true
  }, {
    id: "other-extension",
    url: "https://example.test/"
  }));
  assert.equal(unauthorizedGrant.ok, false);
  assert.equal(runtime.local.bfDataConsentVersion, undefined, "An untrusted sender granted consent");

  const accepted = plain(await runtime.context.routeMessage({
    type: "BF_SET_DATA_CONSENT",
    consent: true
  }, {
    id: runtime.context.chrome.runtime.id,
    url: runtime.context.chrome.runtime.getURL("src/onboarding.html")
  }));
  assert.equal(accepted.consentGranted, true);

  const allowedState = plain(await runtime.context.routeMessage({ type: "BF_GET_STATE" }, {}));
  assert.equal(allowedState.ok, true);
  assert.equal(runtime.calls.treeReads, 1);
  assert.equal(runtime.local.bfDataConsentVersion, 1);

  const declined = plain(await runtime.context.routeMessage({
    type: "BF_SET_DATA_CONSENT",
    consent: false
  }, {
    id: runtime.context.chrome.runtime.id,
    url: runtime.context.chrome.runtime.getURL("src/onboarding.html")
  }));
  assert.equal(declined.consentGranted, false);
  assert.equal(runtime.local.bfDataConsentVersion, 0);
  const relockedState = plain(await runtime.context.routeMessage({ type: "BF_GET_STATE" }, {}));
  assert.equal(relockedState.consentRequired, true);
  assert.equal(runtime.calls.treeReads, 1, "Revoked consent still allowed bookmark reads");
});

test("extension update opens consent setup only when the current consent version is missing", async () => {
  const missing = createRuntime({ tree: emptyTree(), consent: false });
  await missing.listeners.installed({ reason: "update" });
  assert.equal(missing.local.bfDataConsentVersion, 0);
  assert.equal(missing.local.bfOnboardingSeen, false);
  assert.deepEqual(missing.calls.tabsCreated, ["chrome-extension://test-extension-id/src/onboarding.html"]);
  assert.equal(missing.calls.treeReads, 0);

  const accepted = createRuntime({ tree: emptyTree(), consent: true });
  await accepted.listeners.installed({ reason: "update" });
  assert.deepEqual(accepted.calls.tabsCreated, []);
});

function createRuntime({
  tree,
  sync = {},
  local = {},
  consent = true,
  failFolderColorLocalWrite = false,
  language = "en"
}) {
  const syncStore = plain(sync);
  const localStore = {
    ...(consent ? { bfDataConsentVersion: 1 } : {}),
    ...plain(local)
  };
  const calls = {
    created: [],
    moved: [],
    syncRemoved: [],
    tabsCreated: [],
    treeReads: 0
  };
  let nextBookmarkId = 1;
  const listeners = {};
  const noOpEvent = { addListener() {}, removeListener() {} };
  const context = vm.createContext({
    URL,
    clearTimeout() {},
    console,
    setTimeout() {
      return 1;
    }
  });

  context.chrome = {
    bookmarks: {
      getTree: async () => {
        calls.treeReads += 1;
        return [tree];
      },
      create: async (details) => {
        const created = details.url
          ? bookmark(`created-${nextBookmarkId++}`, details.title, details.url, details.parentId, true)
          : folder(`created-${nextBookmarkId++}`, details.title, details.parentId, true);
        const parent = findNode(tree, details.parentId);
        parent?.children?.push(created);
        calls.created.push(plain(details));
        return created;
      },
      move: async (id, destination) => {
        calls.moved.push({ id, ...plain(destination) });
        return findNode(tree, id);
      },
      onChanged: noOpEvent,
      onChildrenReordered: noOpEvent,
      onCreated: noOpEvent,
      onImportEnded: noOpEvent,
      onMoved: noOpEvent,
      onRemoved: noOpEvent
    },
    commands: { onCommand: noOpEvent },
    i18n: {
      getMessage: (key) => key,
      getUILanguage: () => language
    },
    runtime: {
      id: "test-extension-id",
      getURL: (value) => `chrome-extension://test-extension-id/${value}`,
      onInstalled: { addListener(listener) { listeners.installed = listener; } },
      onMessage: { addListener(listener) { listeners.message = listener; } },
      sendMessage: async () => {}
    },
    storage: {
      local: createStorageArea(localStore, {
        setGuard(values) {
          if (failFolderColorLocalWrite && Object.hasOwn(values, "folderColors")) {
            throw new Error("Synthetic local storage failure");
          }
        }
      }),
      onChanged: noOpEvent,
      sync: createStorageArea(syncStore, {
        onRemove(key) {
          calls.syncRemoved.push(key);
        }
      })
    },
    tabs: {
      create: async ({ url }) => { calls.tabsCreated.push(url); },
      query: async () => [],
      sendMessage: async () => {}
    }
  };
  context.importScripts = (...files) => {
    files.forEach((file) => {
      const source = readFileSync(join(projectRoot, "src", file), "utf8");
      vm.runInContext(source, context, { filename: file });
    });
  };

  vm.runInContext(backgroundSource, context, { filename: "background.js" });
  return {
    calls,
    context,
    listeners,
    local: localStore,
    sync: syncStore
  };
}

function createStorageArea(store, { onRemove = () => {}, setGuard = () => {} } = {}) {
  return {
    async get(query) {
      return readStorage(store, query);
    },
    async remove(keyOrKeys) {
      for (const key of Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys]) {
        delete store[key];
        onRemove(key);
      }
    },
    async set(values) {
      setGuard(values);
      Object.assign(store, plain(values));
    }
  };
}

function readStorage(store, query) {
  if (typeof query === "string") {
    return Object.hasOwn(store, query) ? { [query]: plain(store[query]) } : {};
  }

  if (Array.isArray(query)) {
    return Object.fromEntries(
      query.filter((key) => Object.hasOwn(store, key)).map((key) => [key, plain(store[key])])
    );
  }

  return Object.fromEntries(
    Object.entries(query || {}).map(([key, fallback]) => [
      key,
      Object.hasOwn(store, key) ? plain(store[key]) : plain(fallback)
    ])
  );
}

function emptyTree() {
  return {
    id: "0",
    title: "",
    children: [{
      id: "local-bar",
      title: "Bookmarks bar",
      folderType: "bookmarks-bar",
      syncing: false,
      children: []
    }]
  };
}

function bookmark(id, title, url, parentId, syncing) {
  return { id, parentId, syncing, title, url };
}

function folder(id, title, parentId, syncing, children = []) {
  return { children, id, parentId, syncing, title };
}

function findNode(node, id) {
  if (!node || node.id === id) return node || null;
  for (const child of node.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function plain(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
