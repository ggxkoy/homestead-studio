import { type Project, type Photo, validateProject } from "./model";
let dbPromise: Promise<IDBDatabase> | undefined;
function database() {
  return (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("homestead-studio", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("projects");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
export async function loadProject(): Promise<Project | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction("projects")
      .objectStore("projects")
      .get("current");
    req.onsuccess = () => {
      try {
        resolve(req.result ? validateProject(req.result) : null);
      } catch (e) {
        reject(e);
      }
    };
    req.onerror = () => reject(req.error);
  });
}
export async function saveProject(p: Project) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").put(p, "current");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function imageToPhoto(file: File): Promise<Photo> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("请选择 JPG、PNG 或 WebP 照片");
  if (file.size > 20 * 1024 * 1024) throw Error("每张照片请小于 20 MB");
  const bmp = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)),
      c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return {
      id: crypto.randomUUID(),
      name: file.name,
      data: c.toDataURL("image/jpeg", 0.85),
    };
  } finally {
    bmp.close();
  }
}
