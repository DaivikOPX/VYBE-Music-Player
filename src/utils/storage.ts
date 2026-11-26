import { PersistedAppState, Track } from '../types';

const LS_STATE_KEY = 'spotify_clone_state_v1';
const DB_NAME = 'spotify_clone_offline_db';
const DB_VERSION = 2;
const STORE_TRACKS = 'tracks_meta';
const STORE_BLOBS = 'audio_blobs';
const STORE_DIR_HANDLES = 'dir_handles';

const AUDIO_EXT_RE = /\.(mp3|wav|ogg|flac|m4a|aac|opus|webm|aiff|aif)$/i;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
      if (!db.objectStoreNames.contains(STORE_DIR_HANDLES)) {
        db.createObjectStore(STORE_DIR_HANDLES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBrowserAudioTrack(track: Track, fileBlob: Blob): Promise<void> {
  if (window.electronAPI) return;
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_TRACKS, STORE_BLOBS], 'readwrite');
    const storable: Track = { ...track, audioUrl: '' };
    tx.objectStore(STORE_TRACKS).put(storable);
    tx.objectStore(STORE_BLOBS).put(fileBlob, track.id);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('IndexedDB save failed:', err);
  }
}

export async function loadBrowserAudioTracks(): Promise<Track[]> {
  if (window.electronAPI) return [];
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_TRACKS, STORE_BLOBS], 'readonly');
    const tracksReq = tx.objectStore(STORE_TRACKS).getAll();
    const metas: Track[] = await new Promise((res, rej) => {
      tracksReq.onsuccess = () => res((tracksReq.result as Track[]) || []);
      tracksReq.onerror = () => rej(tracksReq.error);
    });

    const blobStore = tx.objectStore(STORE_BLOBS);
    const hydrated: Track[] = [];
    for (const meta of metas) {
      const bReq = blobStore.get(meta.id);
      const blob = await new Promise<Blob | undefined>(res => {
        bReq.onsuccess = () => res(bReq.result as Blob | undefined);
        bReq.onerror = () => res(undefined);
      });
      if (blob) {
        hydrated.push({
          ...meta,
          audioUrl: URL.createObjectURL(blob)
        });
      }
    }
    db.close();
    return hydrated;
  } catch {
    return [];
  }
}

export async function deleteBrowserAudioTrack(trackId: string): Promise<void> {
  if (window.electronAPI) return;
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_TRACKS, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_TRACKS).delete(trackId);
    tx.objectStore(STORE_BLOBS).delete(trackId);
    db.close();
  } catch {
    // ignore
  }
}

export async function saveWebDirectoryHandle(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  if (window.electronAPI) return;
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_DIR_HANDLES], 'readwrite');
    tx.objectStore(STORE_DIR_HANDLES).put(handle, key);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

export async function deleteWebDirectoryHandle(key: string): Promise<void> {
  if (window.electronAPI) return;
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_DIR_HANDLES], 'readwrite');
    tx.objectStore(STORE_DIR_HANDLES).delete(key);
    db.close();
  } catch {
    // ignore
  }
}

export async function loadWebDirectoryHandles(): Promise<{ key: string; handle: FileSystemDirectoryHandle }[]> {
  if (window.electronAPI) return [];
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_DIR_HANDLES], 'readonly');
    const store = tx.objectStore(STORE_DIR_HANDLES);
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    const [keys, vals] = await Promise.all([
      new Promise<IDBValidKey[]>((res, rej) => {
        keysReq.onsuccess = () => res(keysReq.result || []);
        keysReq.onerror = () => rej(keysReq.error);
      }),
      new Promise<FileSystemDirectoryHandle[]>((res, rej) => {
        valsReq.onsuccess = () => res((valsReq.result as FileSystemDirectoryHandle[]) || []);
        valsReq.onerror = () => rej(valsReq.error);
      })
    ]);
    db.close();
    return keys.map((k, i) => ({ key: String(k), handle: vals[i] })).filter(x => Boolean(x.handle));
  } catch {
    return [];
  }
}

export async function collectFilesFromWebDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  out: File[] = []
): Promise<File[]> {
  try {
    const iter = (dirHandle as unknown as { values: () => AsyncIterable<FileSystemHandle> }).values();
    for await (const entry of iter) {
      if (entry.kind === 'file') {
        const file = await (entry as FileSystemFileHandle).getFile();
        if (AUDIO_EXT_RE.test(file.name) || /\.(lrc|txt)$/i.test(file.name) || file.type.startsWith('audio/')) {
          out.push(file);
        }
      } else if (entry.kind === 'directory') {
        await collectFilesFromWebDirectoryHandle(entry as FileSystemDirectoryHandle, out);
      }
    }
  } catch {
    // ignore inaccessible entry
  }
  return out;
}

export async function loadPersistedState(): Promise<PersistedAppState | null> {
  if (window.electronAPI?.loadState) {
    return window.electronAPI.loadState();
  }
  try {
    const raw = localStorage.getItem(LS_STATE_KEY);
    return raw ? (JSON.parse(raw) as PersistedAppState) : null;
  } catch {
    return null;
  }
}

export async function savePersistedState(state: PersistedAppState): Promise<void> {
  if (window.electronAPI?.saveState) {
    await window.electronAPI.saveState(state);
    return;
  }
  try {
    localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}
