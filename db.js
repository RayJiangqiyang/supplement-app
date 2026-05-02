// ============================================================
// db.js — IndexedDB 数据层 (supplement-app)
// All CRUD operations for supplements, todos, daily_log, todo_log
// ============================================================

// --- Step 1: Database initialization ---

const DB_NAME = 'supplement_app';
const DB_VERSION = 1;
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('supplements')) {
        const s = db.createObjectStore('supplements', { keyPath: 'id' });
        s.createIndex('sortOrder', 'sortOrder');
        s.createIndex('deleted', 'deleted');
      }
      if (!db.objectStoreNames.contains('todos')) {
        const t = db.createObjectStore('todos', { keyPath: 'id' });
        t.createIndex('sortOrder', 'sortOrder');
      }
      if (!db.objectStoreNames.contains('daily_log')) {
        const dl = db.createObjectStore('daily_log', { keyPath: 'id' });
        dl.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('todo_log')) {
        const tl = db.createObjectStore('todo_log', { keyPath: 'id' });
        tl.createIndex('todoId', 'todoId');
        tl.createIndex('date', 'date');
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// --- Step 2: supplements CRUD ---

async function getSupplements() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('supplements', 'readonly');
    const store = tx.objectStore('supplements');
    const request = store.getAll();
    request.onsuccess = () => {
      const items = request.result
        .filter(s => !s.deleted)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

async function addSupplement(data) {
  const item = {
    id: generateId(),
    name: data.name,
    icon: data.icon || '💊',
    photo: data.photo || null,
    reminderTimes: data.reminderTimes || ['22:00'],
    sortOrder: Date.now(),
    createdAt: Date.now(),
    deleted: false
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction('supplements', 'readwrite');
    tx.objectStore('supplements').add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

async function updateSupplement(id, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('supplements', 'readwrite');
    const store = tx.objectStore('supplements');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) return reject(new Error('not found'));
      if (data.name !== undefined) item.name = data.name;
      if (data.icon !== undefined) item.icon = data.icon;
      if (data.photo !== undefined) item.photo = data.photo;
      if (data.reminderTimes !== undefined) item.reminderTimes = data.reminderTimes;
      if (data.sortOrder !== undefined) item.sortOrder = data.sortOrder;
      store.put(item);
      tx.oncomplete = () => resolve(item);
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteSupplement(id) {
  return updateSupplement(id, { deleted: true });
}

async function updateSupplementOrder(orderedIds) {
  return new Promise((resolve, reject) => {
    if (orderedIds.length === 0) return resolve();
    const tx = db.transaction('supplements', 'readwrite');
    const store = tx.objectStore('supplements');
    let count = 0;
    orderedIds.forEach((id, index) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (item) {
          item.sortOrder = index;
          store.put(item);
        }
        count++;
        if (count === orderedIds.length) resolve();
      };
    });
    tx.onerror = () => reject(tx.error);
  });
}

// --- Step 3: todos CRUD ---

async function getTodos() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('todos', 'readonly');
    const store = tx.objectStore('todos');
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result.sort((a, b) => a.sortOrder - b.sortOrder));
    };
    request.onerror = () => reject(request.error);
  });
}

async function addTodo(text) {
  const item = {
    id: generateId(),
    text,
    sortOrder: Date.now(),
    createdAt: Date.now()
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction('todos', 'readwrite');
    tx.objectStore('todos').add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

async function updateTodo(id, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('todos', 'readwrite');
    const store = tx.objectStore('todos');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) return reject(new Error('not found'));
      if (data.text !== undefined) item.text = data.text;
      if (data.sortOrder !== undefined) item.sortOrder = data.sortOrder;
      store.put(item);
      tx.oncomplete = () => resolve(item);
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteTodo(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['todos', 'todo_log'], 'readwrite');
    tx.objectStore('todos').delete(id);
    const logStore = tx.objectStore('todo_log');
    const index = logStore.index('todoId');
    const cursorReq = index.openCursor(IDBKeyRange.only(id));
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.todoId === id) cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateTodoOrder(orderedIds) {
  return new Promise((resolve, reject) => {
    if (orderedIds.length === 0) return resolve();
    const tx = db.transaction('todos', 'readwrite');
    const store = tx.objectStore('todos');
    let count = 0;
    orderedIds.forEach((id, index) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (item) {
          item.sortOrder = index;
          store.put(item);
        }
        count++;
        if (count === orderedIds.length) resolve();
      };
    });
    tx.onerror = () => reject(tx.error);
  });
}

// --- Step 4: daily_log operations ---

async function getTodayLogs() {
  const today = getToday();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('daily_log', 'readonly');
    const store = tx.objectStore('daily_log');
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result.filter(log => log.date === today));
    };
    request.onerror = () => reject(request.error);
  });
}

async function markSupplementTaken(supplementId) {
  const today = getToday();
  const id = `${supplementId}_${today}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('daily_log', 'readwrite');
    const store = tx.objectStore('daily_log');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      const log = existing || { id, supplementId, date: today };
      log.taken = !(existing && existing.taken);
      log.takenAt = log.taken ? Date.now() : null;
      store.put(log);
      tx.oncomplete = () => resolve(log);
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function getDailyLogsByDate(date) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('daily_log', 'readonly');
    const store = tx.objectStore('daily_log');
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result.filter(log => log.date === date));
    };
    request.onerror = () => reject(request.error);
  });
}

async function getDailyLogsByMonth(year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('daily_log', 'readonly');
    const store = tx.objectStore('daily_log');
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result.filter(log => log.date.startsWith(prefix)));
    };
    request.onerror = () => reject(request.error);
  });
}

// --- Step 5: todo_log operations ---

async function getTodayTodoLogs() {
  const today = getToday();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('todo_log', 'readonly');
    const store = tx.objectStore('todo_log');
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result.filter(log => log.date === today));
    };
    request.onerror = () => reject(request.error);
  });
}

async function markTodoDone(todoId) {
  const today = getToday();
  const id = `${todoId}_${today}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('todo_log', 'readwrite');
    const store = tx.objectStore('todo_log');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      const log = existing || { id, todoId, date: today };
      log.done = !(existing && existing.done);
      log.doneAt = log.done ? Date.now() : null;
      store.put(log);
      tx.oncomplete = () => resolve(log);
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function getTodoLogsByDate(date) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('todo_log', 'readonly');
    const store = tx.objectStore('todo_log');
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result.filter(log => log.date === date));
    };
    request.onerror = () => reject(request.error);
  });
}

async function getTodoLogsAll() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('todo_log', 'readonly');
    const store = tx.objectStore('todo_log');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
