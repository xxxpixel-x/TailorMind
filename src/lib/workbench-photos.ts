import type { InterviewPhoto } from "@/lib/types";

export const PHOTO_LIMIT = 6;
const database = "liangyi_interview_photos";
const storeName = "photos";
export const PHOTO_DRAFT_CHANGED = "liangyi-photo-draft-changed";

interface StoredPhoto extends InterviewPhoto {
  blob: Blob;
  draftKey?: string;
}

// 等事务实际提交后才向界面报告成功。短连接让恢复数据和其他标签页可以正常使用同一照片库。
function transact<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore, result: (value: T) => void) => void) {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open(database, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(storeName, { keyPath: "id" }).createIndex("draftKey", "draftKey");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(storeName, mode);
      let value: T;
      tx.oncomplete = () => { db.close(); resolve(value); };
      tx.onabort = () => { db.close(); reject(tx.error ?? new Error("照片保存中断")); };
      work(tx.objectStore(storeName), v => { value = v; });
    };
  });
}

function metadata({ id, at, label }: StoredPhoto): InterviewPhoto { return { id, at, label }; }

export function draftPhotos(key: string) {
  return transact<InterviewPhoto[]>("readonly", (store, result) => {
    const request = store.index("draftKey").getAll(key);
    request.onsuccess = () => result((request.result as StoredPhoto[]).map(metadata).sort((a, b) => a.at.localeCompare(b.at)));
  });
}

export function photoBlob(id: string) {
  return transact<Blob | undefined>("readonly", (store, result) => {
    const request = store.get(id);
    request.onsuccess = () => result((request.result as StoredPhoto | undefined)?.blob);
  });
}

async function compress(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("浏览器无法处理这张图片");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob =>
      blob ? resolve(blob) : reject(new Error("图片压缩失败")), "image/jpeg", 0.84));
  } finally { URL.revokeObjectURL(url); }
}

export async function addDraftPhotos(key: string, files: File[], available: number, signal: AbortSignal) {
  const records: StoredPhoto[] = [];
  let unreadable = 0;
  // 逐张解码，限制手机上同时占用的原图内存。
  for (const file of files) {
    if (records.length >= available || signal.aborted) break;
    try {
      const blob = await compress(file);
      const id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, "0")).join("");
      records.push({ id, label: "体型照", at: new Date().toISOString(), draftKey: key, blob });
    } catch { unreadable++; }
  }
  if (signal.aborted) return "";
  const added = await transact<number>("readwrite", (store, result) => {
    const count = store.index("draftKey").count(key);
    count.onsuccess = () => {
      const accepted = signal.aborted ? [] : records.slice(0, Math.max(0, available - count.result));
      accepted.forEach(record => store.add(record));
      result(accepted.length);
    };
  });
  return [unreadable ? "有图片无法读取，请换一张。" : "", files.length - unreadable > added ? "每单最多添加 6 张照片。" : ""].filter(Boolean).join(" ");
}

export function editDraftPhoto(key: string, id: string, label?: InterviewPhoto["label"]) {
  return transact<void>("readwrite", store => {
    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result as StoredPhoto | undefined;
      if (record?.draftKey !== key) return;
      if (label) store.put({ ...record, label });
      else store.delete(id);
    };
  });
}

// 订单元数据写入成功后解除草稿归属。中途刷新时可按同一批 id 再次执行。
export async function archivePhotos(ids: string[]) {
  await transact<void>("readwrite", store => {
    for (const id of ids) {
      const request = store.get(id);
      request.onsuccess = () => {
        const photo = request.result as StoredPhoto | undefined;
        if (!photo?.draftKey) return;
        delete photo.draftKey;
        store.put(photo);
      };
    }
  });
  window.dispatchEvent(new Event(PHOTO_DRAFT_CHANGED));
}

export function clearPhotoLibrary() {
  return transact<void>("readwrite", store => { store.clear(); });
}
