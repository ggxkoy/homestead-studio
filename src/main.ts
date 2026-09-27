import "./style.css";
import {
  createIcons,
  House,
  Plus,
  MousePointer2,
  RotateCw,
  Box,
  X,
  Download,
  Upload,
  ChevronRight,
  Camera,
  Focus,
  Maximize2,
  Layers,
  Grid2X2,
  Eye,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Sofa,
  Armchair,
  RectangleHorizontal,
  BedDouble,
  PanelsTopLeft,
  Table2,
  Table,
  LibraryBig,
  Archive,
  Square,
  Bath,
  ImagePlus,
  Check,
  Menu,
  Info,
  ZoomIn,
} from "lucide";
import {
  ROOMS,
  CATALOG,
  emptyProject,
  roomFor,
  clampPlacement,
  findSpot,
  overlap,
  validateProject,
  type Project,
  type Furniture,
  type Kind,
  type Photo,
} from "./model";
import { loadProject, saveProject, imageToPhoto } from "./storage";
import { HomesteadScene, type View } from "./scene";
const icons = {
  House,
  Plus,
  MousePointer2,
  RotateCw,
  Box,
  X,
  Download,
  Upload,
  ChevronRight,
  Camera,
  Focus,
  Maximize2,
  Layers,
  Grid2x2: Grid2X2,
  Eye,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Sofa,
  Armchair,
  RectangleHorizontal,
  BedDouble,
  PanelsTopLeft,
  Table2,
  Table,
  LibraryBig,
  Archive,
  Square,
  Bath,
  ImagePlus,
  Check,
  Menu,
  Info,
  ZoomIn,
};
const icon = (name: string) =>
  `<i data-lucide="${name}" aria-hidden="true"></i>`;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const app = $("#app");
app.innerHTML = `
 <header class="app-header"><div class="brand"><span class="brand-mark">${icon("house")}</span><div><h1>庭院<span>空间规划</span></h1><p>12.96 × 18.30 m</p></div></div><div class="header-actions"><span id="save-status" role="status">正在读取方案…</span><button id="undo" class="icon-button" aria-label="撤销" title="撤销 Ctrl+Z">${icon("undo-2")}</button><button id="redo" class="icon-button" aria-label="重做" title="重做 Ctrl+Shift+Z">${icon("redo-2")}</button><span class="divider"></span><button id="import" class="button subtle">${icon("upload")}<span>导入方案</span></button><button id="export" class="button primary">${icon("download")}<span>导出方案</span></button></div></header>
 <main class="workspace"><aside class="rooms-panel" aria-label="房间列表"><div class="panel-heading"><div><span class="eyebrow">SPACE</span><h2>我的空间</h2></div><span class="count">${ROOMS.length}</span></div><div id="room-list"></div><div class="plan-note">${icon("info")}<p>以第二张图纸为基准<br>层高 3.3 m 暂定 · 无楼梯<br><span>局部尺寸仍需实测复核</span></p></div></aside>
 <section class="editor"><div class="editor-top"><div class="view-tabs" role="group" aria-label="视图"><button data-view="cut" class="active">${icon("layers")}3D 剖视</button><button data-view="plan">${icon("grid-2x2")}俯视摆放</button><button data-view="outside">${icon("house")}完整外观</button></div><button id="labels" class="icon-button selected" aria-label="切换房间标注" aria-pressed="true">${icon("eye")}</button></div>
 <div id="stage"><div class="stage-top"><span id="view-caption">单层 · 墙体剖切</span><span class="north">N ↑</span></div><div class="stage-actions"><button id="focus" class="button canvas-button">${icon("focus")}<span>聚焦房间</span></button><button id="overview" class="icon-button canvas-button" aria-label="全屋视角">${icon("maximize-2")}</button></div><div class="stage-help" id="stage-help">${icon("mouse-pointer-2")}拖动空白旋转 · 拖动家具摆放 · 滚轮缩放</div><div class="scene-loading" id="scene-loading">正在搭建空间…</div></div>
 <div class="catalog-panel"><div class="catalog-heading"><div><span class="eyebrow">FURNITURE</span><h2>为 <span id="catalog-room">客厅</span> 添加家具</h2></div><span class="catalog-note">实木家具 · 尺寸可调整</span></div><div id="catalog" class="catalog"></div></div></section>
 <aside class="inspector" aria-label="房间与家具详情"><div id="inspector-content"></div></aside></main>
 <input hidden type="file" id="room-upload" accept="image/jpeg,image/png,image/webp" multiple><input hidden type="file" id="furniture-upload" accept="image/jpeg,image/png,image/webp" multiple><input hidden type="file" id="project-upload" accept="application/json,.json">
 <dialog id="photo-dialog"><button class="icon-button dialog-close" aria-label="关闭照片">${icon("x")}</button><img alt="参考照片大图"><p></p></dialog>
 <dialog id="confirm-dialog"><h2>导入新方案？</h2><p>当前方案将被替换。可以先导出备份，导入后也可以撤销。</p><div class="dialog-actions"><button class="button" id="cancel-import">取消</button><button class="button primary" id="confirm-import">导入并替换</button></div></dialog>
 <div id="toast" role="status" aria-live="polite"></div>`;
let project: Project = emptyProject(),
  roomId = "living",
  furnitureId: string | null = null,
  scene: HomesteadScene,
  showLabels = true,
  loading = true;
let undo: Project[] = [],
  redo: Project[] = [],
  checkpoint: Project = structuredClone(project),
  saveRevision = 0,
  saveChain = Promise.resolve(),
  toastTimer = 0,
  importCandidate: Project | null = null;
const refreshIcons = () =>
  createIcons({ icons, attrs: { "stroke-width": 1.65 } });
function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => $("#toast").classList.remove("visible"),
    4000,
  );
}
function persist() {
  const snapshot = structuredClone(project),
    revision = ++saveRevision;
  $("#save-status").textContent = "正在保存…";
  saveChain = saveChain
    .catch(() => {})
    .then(() => saveProject(snapshot))
    .then(() => {
      if (revision === saveRevision) {
        $("#save-status").textContent = "已保存于本机";
        $("#save-status").classList.remove("error");
      }
    })
    .catch(() => {
      if (revision === saveRevision) {
        $("#save-status").textContent = "保存失败，请立即导出";
        $("#save-status").classList.add("error");
        toast("本机存储不足或不可用，请导出方案备份");
      }
    });
}
function commit() {
  undo.push(checkpoint);
  if (undo.length > 15) undo.shift();
  redo = [];
  project.updatedAt = new Date().toISOString();
  checkpoint = structuredClone(project);
  persist();
  refreshHistory();
  renderRoomList();
}
function refreshHistory() {
  $<HTMLButtonElement>("#undo").disabled = undo.length === 0;
  $<HTMLButtonElement>("#redo").disabled = redo.length === 0;
}
function currentItem() {
  return project.furniture.find((f) => f.id === furnitureId) || null;
}
function setRoom(id: string) {
  roomId = id;
  furnitureId = null;
  scene.selectRoom(id);
  scene.selectFurniture(null);
  renderPanels();
}
function setFurniture(id: string) {
  const f = project.furniture.find((v) => v.id === id);
  if (!f) return;
  roomId = f.roomId;
  furnitureId = id;
  scene.selectRoom(roomId);
  scene.selectFurniture(id);
  renderPanels();
}
function renderRoomList() {
  let zone = "";
  $("#room-list").innerHTML = ROOMS.map((r) => {
    let heading = "";
    if (r.zone !== zone) {
      zone = r.zone;
      heading = `<h3 class="zone-heading">${r.zone}</h3>`;
    }
    const b = r.bounds,
      n = project.furniture.filter((f) => f.roomId === r.id).length;
    return (
      heading +
      `<div class="room-row ${r.id === roomId ? "active" : ""}"><button class="room-select" data-room="${r.id}" aria-pressed="${r.id === roomId}"><span class="room-glyph">${icon(r.id === "yard" ? "square" : r.id.includes("bed") || r.id === "master" ? "bed-double" : r.id === "study" ? "library-big" : "box")}</span><span class="room-text"><strong>${r.name}</strong><small>${((b[2] - b[0]) * (b[3] - b[1])).toFixed(1)} m² · ${n} 件家具</small></span></button><button class="room-add" data-room-add="${r.id}" aria-label="为${r.name}添加家具">${icon("plus")}</button></div>`
    );
  }).join("");
  refreshIcons();
}
function gallery(photos: Photo[], target: "room" | "furniture") {
  return photos.length
    ? `<div class="photo-grid">${photos.map((p) => `<div class="photo-tile"><button data-photo="${esc(p.id)}" data-target="${target}" aria-label="查看${esc(p.name)}"><img src="${p.data}" alt="${esc(p.name)}" loading="lazy"></button><button class="photo-remove" data-remove-photo="${esc(p.id)}" data-target="${target}" aria-label="删除照片 ${esc(p.name)}">${icon("x")}</button></div>`).join("")}</div>`
    : `<div class="empty-photo">${icon("image-plus")}<span>${target === "room" ? "添加这个空间的实景或风格参考" : "添加这件家具的实物或款式照片"}</span></div>`;
}
function photosSection(target: "room" | "furniture", photos: Photo[]) {
  return `<section class="photo-section"><div class="section-heading"><h3>${target === "room" ? "房间参考照片" : "家具参考照片"} <span>${photos.length}</span></h3><button class="text-button" data-upload="${target}">${icon("plus")}上传</button></div>${gallery(photos, target)}<p class="micro">JPG / PNG / WebP · 单张 ≤ 20 MB · 最多 30 张</p></section>`;
}
function renderInspector() {
  const r = roomFor(roomId),
    b = r.bounds,
    items = project.furniture.filter((f) => f.roomId === roomId),
    f = currentItem();
  $("#inspector-content").innerHTML =
    `<div class="inspector-header"><span class="eyebrow">${f ? "SELECTED FURNITURE" : "ROOM DETAILS"}</span><div class="inspector-title"><h2>${f ? esc(f.name) : r.name}</h2>${f ? `<button class="icon-button" id="deselect" aria-label="返回房间详情">${icon("x")}</button>` : ""}</div><p>${f ? r.name : `约 ${(b[2] - b[0]).toFixed(2)} × ${(b[3] - b[1]).toFixed(2)} m`}</p></div>
 ${f ? `<section class="properties"><label class="field-label">家具名称<input id="f-name" value="${esc(f.name)}" maxlength="40"></label><div class="dimensions"><label>宽 / m<input type="number" id="f-width" min="0.1" max="8" step="0.05" value="${f.width}"></label><label>深 / m<input type="number" id="f-depth" min="0.1" max="8" step="0.05" value="${f.depth}"></label><label>高 / m<input type="number" id="f-height" min="0.1" max="4" step="0.05" value="${f.height}"></label></div><div class="position-fields"><label>距西侧 / m<input type="number" id="f-x" step="0.05" value="${(f.x - b[0]).toFixed(2)}"></label><label>距北侧 / m<input type="number" id="f-z" step="0.05" value="${(f.z - b[1]).toFixed(2)}"></label></div><p class="micro">位置以家具中心计算，自动限制在当前房间内。</p><div class="rotation-row"><label>旋转角度<input type="number" id="f-rotation" step="15" value="${f.rotation}"></label><button class="button" id="rotate">${icon("rotate-cw")}转 90°</button></div><div class="object-actions"><button class="button" id="duplicate">${icon("copy")}复制</button><button class="button danger" id="delete">${icon("trash-2")}删除</button></div><p id="overlap-warning" class="overlap-warning" ${project.furniture.some((v) => v.id !== f.id && overlap(f, v)) ? "" : "hidden"}>与其他家具重叠，可继续拖动调整。</p></section>${photosSection("furniture", f.photos)}` : `<div class="room-summary"><span>${items.length}<small>件家具</small></span><span>${(project.roomPhotos[roomId] || []).length}<small>张参考照片</small></span></div><p class="room-note">${r.note}</p>${photosSection("room", project.roomPhotos[roomId] || [])}`}
 <section class="furniture-section"><div class="section-heading"><h3>房间内家具 <span>${items.length}</span></h3><button class="text-button" id="jump-catalog">${icon("plus")}添加</button></div>${items.length ? `<div class="furniture-list">${items.map((item) => `<button class="furniture-row ${item.id === furnitureId ? "active" : ""}" data-item="${item.id}"><span class="furniture-mini">${icon(CATALOG.find((c) => c.kind === item.kind)!.icon)}</span><span><strong>${esc(item.name)}</strong><small>${item.width.toFixed(2)} × ${item.depth.toFixed(2)} m${item.photos.length ? " · " + item.photos.length + " 张照片" : ""}</small></span>${icon("chevron-right")}</button>`).join("")}</div>` : `<div class="empty-furniture">还没有家具<br><span>点击下方家具库，开始布置这个房间</span></div>`}</section>
 <div class="storage-note">${icon("check")}<p>照片与方案仅保存在当前浏览器。<br>导出方案可包含全部照片，方便备份或换设备。</p></div>`;
  refreshIcons();
}
function renderPanels() {
  renderRoomList();
  renderInspector();
  $("#catalog-room").textContent = roomFor(roomId).name;
}
function jumpCatalog() {
  $("#catalog").scrollIntoView({ behavior: "smooth", block: "nearest" });
  $("#catalog").classList.remove("highlight");
  requestAnimationFrame(() => $("#catalog").classList.add("highlight"));
  $<HTMLButtonElement>("#catalog button").focus({ preventScroll: true });
}
function addFurniture(kind: Kind, source?: Furniture) {
  const c = CATALOG.find((c) => c.kind === kind)!;
  const f: Furniture = source
    ? {
        ...structuredClone(source),
        id: crypto.randomUUID(),
        name: source.name + " 副本",
      }
    : {
        id: crypto.randomUUID(),
        roomId,
        kind,
        name: c.name,
        x: 0,
        z: 0,
        rotation: 0,
        width: c.width,
        depth: c.depth,
        height: c.height,
        photos: [],
      };
  let placed = findSpot(f, project.furniture);
  if (!placed) {
    const r = roomFor(roomId),
      b = r.bounds;
    placed = clampPlacement(
      { ...f, x: (b[0] + b[2]) / 2, z: (b[1] + b[3]) / 2 },
      r,
    );
    if (!placed) {
      toast("这件家具大于房间可用空间，请选择更小的家具，或用自定义家具");
      return;
    }
    toast("房间较拥挤，家具已放在中央，请调整位置避免重叠");
  }
  project.furniture.push(placed);
  scene.setFurniture(project.furniture);
  if (scene.getView() === "outside") changeView("cut");
  setFurniture(placed.id);
  commit();
}
function updateItem(patch: Partial<Furniture>) {
  const old = currentItem();
  if (!old) return;
  const candidate = { ...old, ...patch };
  if (
    ![
      candidate.width,
      candidate.depth,
      candidate.height,
      candidate.rotation,
      candidate.x,
      candidate.z,
    ].every(Number.isFinite) ||
    [candidate.width, candidate.depth, candidate.height].some(
      (v) => v < 0.1 || v > 8,
    )
  ) {
    toast("请输入有效尺寸（0.10–8 米）");
    renderInspector();
    return;
  }
  candidate.rotation = ((candidate.rotation % 360) + 360) % 360;
  const next = clampPlacement(candidate, roomFor(old.roomId));
  if (!next) {
    toast("旋转或调整后的家具超出房间尺寸");
    renderInspector();
    return;
  }
  Object.assign(old, next);
  scene.setFurniture(project.furniture);
  commit();
  renderInspector();
}
function removeItem() {
  if (!furnitureId) return;
  project.furniture = project.furniture.filter((f) => f.id !== furnitureId);
  furnitureId = null;
  scene.setFurniture(project.furniture);
  commit();
  renderPanels();
  toast("已删除家具，可撤销恢复");
}
function changeView(view: View) {
  scene.setView(view);
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((el) => {
    const active = el.dataset.view === view;
    el.classList.toggle("active", active);
    el.setAttribute("aria-pressed", String(active));
  });
  $("#view-caption").textContent =
    view === "outside"
      ? "完整外观 · 平屋顶暂定"
      : view === "plan"
        ? "俯视摆放 · 单位：米"
        : "单层 · 墙体剖切";
  $("#stage-help").innerHTML =
    view === "outside"
      ? `${icon("eye")}查看完整外观 · 布置家具请切换剖视或俯视`
      : `${icon("mouse-pointer-2")}${view === "plan" ? "拖动家具摆放 · 右键平移 · 滚轮缩放" : "拖动空白旋转 · 拖动家具摆放 · 滚轮缩放"}`;
  refreshIcons();
}
function applyHistory(direction: "undo" | "redo") {
  const from = direction === "undo" ? undo : redo,
    to = direction === "undo" ? redo : undo;
  if (!from.length) return;
  to.push(structuredClone(project));
  project = from.pop()!;
  checkpoint = structuredClone(project);
  if (!project.furniture.some((f) => f.id === furnitureId)) furnitureId = null;
  scene.setFurniture(project.furniture);
  scene.selectFurniture(furnitureId);
  persist();
  refreshHistory();
  renderPanels();
}
function photoList(target: string) {
  return target === "furniture"
    ? currentItem()?.photos || []
    : project.roomPhotos[roomId] || [];
}
function openPhoto(target: string, id: string) {
  const p = photoList(target).find((v) => v.id === id);
  if (!p) return;
  const dialog = $<HTMLDialogElement>("#photo-dialog");
  dialog.querySelector("img")!.src = p.data;
  dialog.querySelector("p")!.textContent = p.name;
  dialog.showModal();
}
async function handlePhotos(
  input: HTMLInputElement,
  target: "room" | "furniture",
) {
  const files = Array.from(input.files || []);
  input.value = "";
  if (!files.length) return;
  const targetRoom = roomId,
    targetFurniture = furnitureId,
    initial = photoList(target).length;
  if (initial + files.length > 30) {
    toast("每个房间或家具最多保存 30 张照片");
    return;
  }
  toast("正在处理照片…");
  try {
    const photos: Photo[] = [];
    for (const file of files) photos.push(await imageToPhoto(file));
    if (target === "room") {
      project.roomPhotos[targetRoom] ??= [];
      if (project.roomPhotos[targetRoom].length + photos.length > 30)
        throw Error("照片数量超过上限");
      project.roomPhotos[targetRoom].push(...photos);
    } else {
      const f = project.furniture.find((f) => f.id === targetFurniture);
      if (!f) throw Error("原家具已删除，请重新选择家具上传");
      if (f.photos.length + photos.length > 30) throw Error("照片数量超过上限");
      f.photos.push(...photos);
    }
    commit();
    renderPanels();
    toast(`已添加 ${photos.length} 张照片`);
  } catch (e) {
    toast((e as Error).message || "照片读取失败，请换一张重试");
  }
}
function exportProject() {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `庭院方案-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("已导出方案，包含全部家具和参考照片");
}
async function importProject(input: HTMLInputElement) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    if (file.size > 150 * 1024 * 1024)
      throw Error("方案文件过大，请控制在 150 MB 以内");
    importCandidate = validateProject(JSON.parse(await file.text()));
    $<HTMLDialogElement>("#confirm-dialog").showModal();
  } catch (e) {
    toast("导入失败：" + (e as Error).message);
  }
}
document.addEventListener("click", (e) => {
  const el = (e.target as Element).closest<HTMLElement>("button");
  if (!el || loading) return;
  const d = el.dataset;
  if (d.room) setRoom(d.room);
  else if (d.roomAdd) {
    setRoom(d.roomAdd);
    jumpCatalog();
  } else if (d.kind) addFurniture(d.kind as Kind);
  else if (d.item) setFurniture(d.item);
  else if (d.view) changeView(d.view as View);
  else if (d.upload)
    $<HTMLInputElement>(
      d.upload === "room" ? "#room-upload" : "#furniture-upload",
    ).click();
  else if (d.photo) openPhoto(d.target!, d.photo);
  else if (d.removePhoto) {
    const list = photoList(d.target!),
      index = list.findIndex((p) => p.id === d.removePhoto);
    if (index !== -1) list.splice(index, 1);
    commit();
    renderInspector();
  } else
    switch (el.id) {
      case "deselect":
        setRoom(roomId);
        break;
      case "jump-catalog":
        jumpCatalog();
        break;
      case "rotate":
        updateItem({ rotation: (currentItem()!.rotation + 90) % 360 });
        break;
      case "duplicate":
        if (currentItem()) addFurniture(currentItem()!.kind, currentItem()!);
        break;
      case "delete":
        removeItem();
        break;
      case "focus":
        scene.setFocus(!scene.isFocused());
        el.classList.toggle("selected", scene.isFocused());
        el.querySelector("span")!.textContent = scene.isFocused()
          ? "查看全屋"
          : "聚焦房间";
        break;
      case "overview":
        scene.setFocus(false);
        $("#focus").classList.remove("selected");
        $("#focus span").textContent = "聚焦房间";
        break;
      case "labels":
        showLabels = !showLabels;
        scene.setLabels(showLabels);
        el.classList.toggle("selected", showLabels);
        el.setAttribute("aria-pressed", String(showLabels));
        break;
      case "undo":
        applyHistory("undo");
        break;
      case "redo":
        applyHistory("redo");
        break;
      case "export":
        exportProject();
        break;
      case "import":
        $<HTMLInputElement>("#project-upload").click();
        break;
      case "cancel-import":
        $<HTMLDialogElement>("#confirm-dialog").close();
        importCandidate = null;
        break;
      case "confirm-import":
        if (importCandidate) {
          project = importCandidate;
          furnitureId = null;
          scene.setFurniture(project.furniture);
          commit();
          renderPanels();
          importCandidate = null;
          $<HTMLDialogElement>("#confirm-dialog").close();
          toast("方案与照片已导入");
        }
        break;
    }
});
document.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (loading) return;
  if (el.id === "room-upload") void handlePhotos(el, "room");
  else if (el.id === "furniture-upload") void handlePhotos(el, "furniture");
  else if (el.id === "project-upload") void importProject(el);
  else if (el.id === "f-name")
    updateItem({ name: el.value.trim() || "未命名家具" });
  else if (["f-width", "f-depth", "f-height", "f-rotation"].includes(el.id))
    updateItem({ [el.id.slice(2)]: el.valueAsNumber });
  else if (el.id === "f-x")
    updateItem({ x: el.valueAsNumber + roomFor(roomId).bounds[0] });
  else if (el.id === "f-z")
    updateItem({ z: el.valueAsNumber + roomFor(roomId).bounds[1] });
});
document.addEventListener("keydown", (e) => {
  if (
    loading ||
    (e.target instanceof HTMLElement &&
      (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
        e.target.isContentEditable)) ||
    document.querySelector("dialog[open]")
  )
    return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    applyHistory(e.shiftKey ? "redo" : "undo");
  } else if (e.key === "Delete" || e.key === "Backspace") {
    if (furnitureId) {
      e.preventDefault();
      removeItem();
    }
  } else if (e.key.toLowerCase() === "r" && currentItem())
    updateItem({ rotation: currentItem()!.rotation + 90 });
  else if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
    currentItem()
  ) {
    e.preventDefault();
    const f = currentItem()!,
      step = e.shiftKey ? 0.25 : 0.05;
    updateItem({
      x:
        f.x +
        (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0),
      z: f.z + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0),
    });
  }
});
$("#photo-dialog .dialog-close").addEventListener("click", () =>
  $<HTMLDialogElement>("#photo-dialog").close(),
);
$("#photo-dialog").addEventListener("click", (e) => {
  if (e.target === $("#photo-dialog"))
    $<HTMLDialogElement>("#photo-dialog").close();
});
$("#catalog").innerHTML = CATALOG.map(
  (c) =>
    `<button class="catalog-item" data-kind="${c.kind}" aria-label="添加${c.name}"><span class="catalog-icon">${icon(c.icon)}</span><strong>${c.name}</strong><span>${c.width.toFixed(2)} × ${c.depth.toFixed(2)} m</span><span class="catalog-plus">${icon("plus")}</span></button>`,
).join("");
refreshIcons();
try {
  project = (await loadProject()) || emptyProject();
  $("#save-status").textContent = "已保存于本机";
} catch {
  $("#save-status").textContent = "本机存储暂不可用";
  toast("无法读取本机方案，请导入备份或在完成后导出方案");
}
checkpoint = structuredClone(project);
try {
  scene = new HomesteadScene($("#stage"), {
    room: setRoom,
    furniture: setFurniture,
    move: (f, done) => {
      const item = project.furniture.find((i) => i.id === f.id);
      if (item) Object.assign(item, f);
      const b = roomFor(f.roomId).bounds;
      const x = $<HTMLInputElement>("#f-x"),
        z = $<HTMLInputElement>("#f-z");
      if (x) x.value = (f.x - b[0]).toFixed(2);
      if (z) z.value = (f.z - b[1]).toFixed(2);
      const warning = $("#overlap-warning");
      if (warning)
        warning.hidden = !project.furniture.some(
          (i) => i.id !== f.id && overlap(f, i),
        );
      if (done) {
        commit();
        scene.setFurniture(project.furniture);
      }
    },
  });
  scene.setFurniture(project.furniture);
  $("#scene-loading").remove();
  loading = false;
  renderPanels();
  refreshHistory();
  document.documentElement.dataset.ready = "true";
} catch (e) {
  $("#scene-loading").textContent =
    "三维视图暂不可用，请使用支持 WebGL 的浏览器并开启硬件加速。";
  console.error(e);
}
