// Copie locale de la collection (IndexedDB). Elle sert à :
//  - ouvrir l'app instantanément, même sans réseau ;
//  - ne télécharger que ce qui a changé (au lieu de toute la collection, images comprises, à chaque ouverture) ;
//  - garder les modifications faites hors ligne jusqu'à leur envoi.
const STORE_GAMES = "games";
const STORE_META = "meta";

const asPromise = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const txDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

function openDb(name) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB indisponible"));
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore(STORE_GAMES, { keyPath: "id" });
      r.result.createObjectStore(STORE_META, { keyPath: "key" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("IndexedDB bloquée"));
  });
}

// Une base par utilisateur : jamais de mélange entre comptes.
export async function openCache(userId) {
  let db = null;
  try {
    db = await openDb("ludotheque-" + userId);
  } catch (e) {
    console.warn("Copie locale indisponible (navigation privée ?)", e);
  }
  return {
    available: !!db,
    async load() {
      if (!db) return { games: [], meta: {} };
      const tx = db.transaction([STORE_GAMES, STORE_META], "readonly");
      const [games, rows] = await Promise.all([asPromise(tx.objectStore(STORE_GAMES).getAll()), asPromise(tx.objectStore(STORE_META).getAll())]);
      const meta = {};
      rows.forEach((m) => (meta[m.key] = m.value));
      return { games, meta };
    },
    async write({ put = [], remove = [], meta = {} }) {
      if (!db) return;
      const tx = db.transaction([STORE_GAMES, STORE_META], "readwrite");
      const games = tx.objectStore(STORE_GAMES);
      const metas = tx.objectStore(STORE_META);
      put.forEach((g) => games.put(g));
      remove.forEach((id) => games.delete(id));
      Object.entries(meta).forEach(([key, value]) => metas.put({ key, value }));
      await txDone(tx);
    },
    async clear() {
      if (!db) return;
      const tx = db.transaction([STORE_GAMES, STORE_META], "readwrite");
      tx.objectStore(STORE_GAMES).clear();
      tx.objectStore(STORE_META).clear();
      await txDone(tx);
    },
  };
}
