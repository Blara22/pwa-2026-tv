import { openDB } from "https://cdn.jsdelivr.net/npm/idb@8/+esm";

const DB_NAME = "demo_spa_db";
const DB_VERSION = 1;
const STORE_NAME = "notes";

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if(!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true
      });

      store.createIndex("by_category", "category", { unique:false });
    }
  }
})

export async function addNote(note) {
  const db = await dbPromise;
  return db.put(STORE_NAME, note);
}

export async function getNotes() {
  const db = await dbPromise;
  return db.getAll(STORE_NAME);
}

export async function getNotesByCategory(category) {
  const db = await dbPromise;
  return db.getAllFromIndex(STORE_NAME, "by_category", category);
}

export async function deleteNote(id) {
  const db = await dbPromise;
  return db.delete(STORE_NAME, id);
}