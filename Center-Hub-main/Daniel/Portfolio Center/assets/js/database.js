// IndexedDB storage functions
function openDB() {
  return new Promise((res, rej) => {
    let r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      let d = r.result;
      if (!d.objectStoreNames.contains(STORE))
        d.createObjectStore(STORE, { keyPath: "id" });
    };
    r.onsuccess = () => {
      db = r.result;
      res(db);
    };
    r.onerror = () => rej(r.error);
  });
}
function tx(mode, fn) {
  return new Promise((res, rej) => {
    let t = db.transaction(STORE, mode),
      s = t.objectStore(STORE),
      out;
    try {
      out = fn(s);
    } catch (e) {
      rej(e);
      return;
    }
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
function getAll() {
  return new Promise((res, rej) => {
    let r = db.transaction(STORE).objectStore(STORE).getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
