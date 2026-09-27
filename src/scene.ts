import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  ROOMS,
  SITE,
  roomFor,
  clampPlacement,
  type Furniture,
  type Room,
} from "./model";
export type View = "cut" | "plan" | "outside";
type Callbacks = {
  room: (id: string) => void;
  furniture: (id: string) => void;
  move: (item: Furniture, done: boolean) => void;
};
export class HomesteadScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 180);
  readonly controls: OrbitControls;
  private building = new THREE.Group();
  private roofs = new THREE.Group();
  private furnitureRoot = new THREE.Group();
  private caps = new THREE.Group();
  private floors: THREE.Mesh[] = [];
  private furniture = new Map<string, THREE.Group>();
  private items: Furniture[] = [];
  private labels: { el: HTMLButtonElement; p: THREE.Vector3; room: Room }[] =
    [];
  private outline: THREE.LineLoop;
  private material: Record<string, THREE.MeshStandardMaterial> = {};
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.115);
  private view: View = "cut";
  private roomId = "living";
  private selectedId: string | null = null;
  private focused = false;
  private showLabels = true;
  private dragging: {
    id: string;
    offset: THREE.Vector3;
    start: Furniture;
  } | null = null;
  private down: [number, number] | null = null;
  private pointerId: number | null = null;
  constructor(
    private stage: HTMLElement,
    private callbacks: Callbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor("#f0f2ef", 1);
    this.stage.prepend(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "可旋转和拖动家具的宅基地三维模型",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.tabIndex = 0;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 65;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.enablePan = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#98a395", 2));
    const sun = new THREE.DirectionalLight("#fff4dd", 2.7);
    sun.position.set(-12, 25, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -21,
      right: 21,
      top: 21,
      bottom: -21,
      near: 1,
      far: 70,
    });
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.025;
    this.scene.add(sun);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    const colors = {
      wall: "#e3e2d9",
      floor: "#e4e0d6",
      paving: "#b9beb7",
      frame: "#39483f",
      wood: "#795139",
      fabric: "#d6c8af",
      roof: "#59625c",
      glass: "#aac9d2",
      base: "#cfcec3",
      line: "#a6afa5",
      selected: "#c4d8bc",
      darkwood: "#513a2c",
      ceramic: "#f1ede4",
      accent: "#437358",
    };
    for (const [name, color] of Object.entries(colors))
      this.material[name] = new THREE.MeshStandardMaterial({
        color,
        roughness: name === "glass" ? 0.2 : 0.88,
      });
    this.material.glass.transparent = true;
    this.material.glass.opacity = 0.45;
    this.scene.add(this.building, this.roofs, this.furnitureRoot, this.caps);
    this.buildArchitecture();
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, 0.5),
      new THREE.Vector3(-0.5, 0, 0.5),
    ]);
    this.outline = new THREE.LineLoop(
      geo,
      new THREE.LineBasicMaterial({ color: "#38694c", depthTest: false }),
    );
    this.outline.renderOrder = 5;
    this.outline.visible = false;
    this.scene.add(this.outline);
    const layer = document.createElement("div");
    layer.className = "room-labels";
    this.stage.append(layer);
    for (const room of ROOMS) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "room-label";
      el.textContent = room.name;
      el.setAttribute("aria-label", `选择${room.name}`);
      el.addEventListener("click", () => this.callbacks.room(room.id));
      layer.append(el);
      const b = room.bounds;
      this.labels.push({
        el,
        room,
        p: new THREE.Vector3(
          (b[0] + b[2] - SITE.width) / 2,
          0.8,
          (b[1] + b[3] - SITE.depth) / 2,
        ),
      });
    }
    // Capture first so selecting an object does not also rotate the camera.
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.onDown, true);
    canvas.addEventListener("pointermove", this.onMove, true);
    canvas.addEventListener("pointerup", this.onUp, true);
    canvas.addEventListener("pointercancel", this.onCancel, true);
    canvas.addEventListener("lostpointercapture", this.onLostCapture);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    new ResizeObserver(() => this.resize()).observe(stage);
    this.setView("cut");
    this.selectRoom("living");
    this.resize();
    this.draw();
  }
  private box(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    y: number,
    mat = "wall",
    parent: THREE.Object3D = this.building,
  ) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      this.material[mat],
    );
    m.position.set(x - SITE.width / 2, y + h / 2, z - SITE.depth / 2);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  private wall(
    axis: "x" | "z",
    start: number,
    end: number,
    c: number,
    th = 0.24,
    openings: { a: number; b: number; kind: "window" | "door" }[] = [],
  ) {
    let at = start;
    const part = (a: number, b: number, bottom: number, height: number) => {
      if (b - a < 0.005 || height < 0.005) return;
      if (axis === "x") this.box((a + b) / 2, c, b - a, th, height, bottom);
      else this.box(c, (a + b) / 2, th, b - a, height, bottom);
    };
    for (const o of openings.sort((a, b) => a.a - b.a)) {
      part(at, o.a, 0.1, SITE.height);
      const sill = o.kind === "window" ? 1.05 : 0.1,
        top = 2.35;
      part(o.a, o.b, 0.1, sill - 0.1);
      part(o.a, o.b, top, SITE.height + 0.1 - top);
      const mid = (o.a + o.b) / 2,
        span = o.b - o.a;
      if (o.kind === "window") {
        if (axis === "x") {
          this.box(mid, c, span, 0.065, top - sill, sill, "glass");
          for (const yy of [sill, top - 0.05])
            this.box(mid, c, span, 0.09, 0.05, yy, "frame");
          for (const x of [o.a, mid, o.b])
            this.box(x, c, 0.045, 0.09, top - sill, sill, "frame");
        } else {
          this.box(c, mid, 0.065, span, top - sill, sill, "glass");
          for (const yy of [sill, top - 0.05])
            this.box(c, mid, 0.09, span, 0.05, yy, "frame");
          for (const z of [o.a, mid, o.b])
            this.box(c, z, 0.09, 0.045, top - sill, sill, "frame");
        }
      } else {
        if (axis === "x") {
          this.box(o.a, c, 0.045, th + 0.015, 2.25, 0.1, "wood");
          this.box(o.b, c, 0.045, th + 0.015, 2.25, 0.1, "wood");
          this.box(mid, c, span, th + 0.015, 0.06, 2.29, "wood");
        } else {
          this.box(c, o.a, th + 0.015, 0.045, 2.25, 0.1, "wood");
          this.box(c, o.b, th + 0.015, 0.045, 2.25, 0.1, "wood");
          this.box(c, mid, th + 0.015, span, 0.06, 2.29, "wood");
        }
      }
      at = o.b;
    }
    part(at, end, 0.1, SITE.height);
  }
  private buildArchitecture() {
    const W = SITE.width,
      D = SITE.depth;
    this.box(W / 2, D / 2, W + 0.5, D + 0.5, 0.23, -0.23, "base", this.scene);
    this.box(W / 2, D / 2, W, D, 0.05, 0, "paving", this.scene);
    for (const r of ROOMS) {
      const b = r.bounds,
        m = this.box(
          (b[0] + b[2]) / 2,
          (b[1] + b[3]) / 2,
          b[2] - b[0],
          b[3] - b[1],
          0.05,
          0.06,
          r.zone === "室外" ? "paving" : "floor",
          this.scene,
        );
      m.userData.roomId = r.id;
      this.floors.push(m);
    }
    for (let x = 0.4; x < 12.6; x += 0.85)
      this.box(x, 12.9, 0.01, 3.85, 0.006, 0.112, "line", this.scene);
    for (let z = 11.05; z < 15; z += 0.85)
      this.box(6.48, z, 12.22, 0.01, 0.006, 0.112, "line", this.scene);
    const win = (a: number, b: number) => ({ a, b, kind: "window" as const }),
      door = (a: number, b: number) => ({ a, b, kind: "door" as const });
    this.wall("x", 0, W, 0.185, 0.37, [
      win(0.9, 2.75),
      win(4.2, 6),
      win(6.9, 8.7),
      win(10.05, 11.95),
    ]);
    this.wall("z", 0.37, 9.82, 0.185, 0.37, [win(4.15, 4.95)]);
    this.wall("z", 0.37, 9.82, 12.775, 0.37);
    this.wall("x", 0, W, 9.635, 0.37, [
      win(0.65, 3.03),
      door(4.86, 8.1),
      win(9.93, 12.31),
    ]);
    this.wall("z", 0.37, 9.45, 3.48, 0.24, [door(3.96, 5.11)]);
    this.wall("z", 0.37, 9.45, 9.48, 0.24, [door(4, 4.92)]);
    this.wall("x", 0.37, 3.36, 3.79, 0.24, [door(2.36, 3.28)]);
    this.wall("x", 3.6, 9.36, 3.79, 0.24, [door(8.15, 9.07)]);
    this.wall("x", 9.6, 12.59, 3.79, 0.24, [door(9.69, 10.61)]);
    this.wall("x", 0.37, 3.36, 5.23, 0.24, [door(2.38, 3.3)]);
    this.wall("z", 3.91, 5.11, 2.3, 0.12, [door(4.11, 4.91)]);
    this.wall("x", 9.6, 12.59, 6.11, 0.24, [door(9.7, 10.62)]);
    // East passage is flat. There are intentionally no steps or invented stair enclosures.
    this.wall("x", 0, 9.36, 18.115, 0.37, [
      win(0.7, 1.65),
      win(3.8, 5.7),
      win(6.75, 8.65),
    ]);
    this.wall("z", 15, 17.93, 0.185, 0.37);
    this.wall("z", 15, 17.93, 9.24, 0.24);
    this.wall("x", 0, 9.36, 15, 0.24, [door(2.1, 3.02), door(5.55, 6.75)]);
    this.wall("z", 15.12, 17.93, 3, 0.24, [door(15.45, 16.37)]);
    this.wall("z", 15.12, 17.93, 1.68, 0.12, [
      door(15.22, 16.02),
      door(16.89, 17.69),
    ]);
    this.wall("x", 0.37, 1.62, 16.5, 0.12);
    this.box(0.15, 12.35, 0.3, 5.3, 1.65, 0.1);
    this.box(12.81, 14.12, 0.3, 8.36, 1.65, 0.1);
    this.box(9.61, 18.05, 0.5, 0.5, 2.65, 0.1);
    this.box(12.71, 18.05, 0.5, 0.5, 2.65, 0.1);
    this.box(6.48, 4.91, 13.16, 10.02, 0.18, 3.4, "roof", this.roofs);
    this.box(4.68, 16.65, 9.6, 3.55, 0.18, 3.4, "roof", this.roofs);
    const grid = new THREE.GridHelper(44, 44, "#dce0d8", "#e2e5df");
    grid.position.y = -0.25;
    this.scene.add(grid);
  }
  setView(v: View) {
    this.view = v;
    this.roofs.visible = v === "outside";
    this.caps.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.caps.clear();
    const height = v === "plan" ? 0.38 : 0.83;
    const planes =
      v === "outside"
        ? []
        : [new THREE.Plane(new THREE.Vector3(0, -1, 0), height)];
    for (const mat of Object.values(this.material)) {
      mat.clippingPlanes = [];
      mat.clipShadows = true;
    }
    this.building.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mat = o.material as THREE.MeshStandardMaterial; // Per-building materials keep tall furniture intact in cutaway views.
      if (!o.userData.archMaterial) {
        o.material = mat.clone();
        o.userData.archMaterial = true;
      }
      const own = o.material as THREE.MeshStandardMaterial;
      own.clippingPlanes = planes;
      own.clipShadows = true;
      own.needsUpdate = true;
      if (v !== "outside" && o.geometry instanceof THREE.BoxGeometry) {
        const p = o.geometry.parameters;
        if (
          o.position.y - p.height / 2 < height &&
          o.position.y + p.height / 2 > height
        ) {
          const cap = new THREE.Mesh(
            new THREE.BoxGeometry(p.width, 0.015, p.depth),
            this.material.wall,
          );
          cap.position.set(o.position.x, height - 0.01, o.position.z);
          cap.receiveShadow = true;
          this.caps.add(cap);
        }
      }
    });
    this.controls.enableRotate = v !== "plan";
    this.positionCamera();
    this.selectFurniture(this.selectedId);
  }
  getView() {
    return this.view;
  }
  setLabels(value: boolean) {
    this.showLabels = value;
  }
  setFocus(value: boolean) {
    this.focused = value;
    this.positionCamera();
  }
  isFocused() {
    return this.focused;
  }
  private positionCamera() {
    let x = 0,
      z = 0,
      span = 21;
    if (this.focused && this.view !== "outside") {
      const b = roomFor(this.roomId).bounds;
      x = (b[0] + b[2] - SITE.width) / 2;
      z = (b[1] + b[3] - SITE.depth) / 2;
      span = Math.max(b[2] - b[0], b[3] - b[1]) + 2.0;
    }
    const aspect =
      this.stage.clientWidth / Math.max(1, this.stage.clientHeight);
    let distance =
      (span / (2 * Math.tan(THREE.MathUtils.degToRad(36) / 2))) *
      Math.max(1, 1 / aspect) *
      1.07;
    this.controls.target.set(x, 0.1, z);
    const direction = this.view === "plan"
      ? new THREE.Vector3(0, 1, .00001)
      : this.view === "outside"
        ? new THREE.Vector3(.48, .57, .65).normalize()
        : new THREE.Vector3(.42, .69, .59).normalize();
    const setCamera = () => {
      this.camera.position.copy(new THREE.Vector3(x, 0, z).addScaledVector(direction, distance));
      this.camera.lookAt(this.controls.target);
      this.camera.updateMatrixWorld(true);
    };
    setCamera();
    if (!this.focused || this.view === "outside") {
      // Fit the actual projected parcel, including its nearest corners, on narrow screens.
      for (let iteration = 0; iteration < 4; iteration++) {
        let extent = 0;
        for (const px of [-SITE.width / 2 - .3, SITE.width / 2 + .3])
          for (const pz of [-SITE.depth / 2 - .3, SITE.depth / 2 + .3])
            for (const py of [0, this.view === "outside" ? 3.6 : .9]) {
              const projected = new THREE.Vector3(px, py, pz).project(this.camera);
              extent = Math.max(extent, Math.abs(projected.x), Math.abs(projected.y));
            }
        distance *= extent / .85;
        setCamera();
      }
    }
    this.controls.update();
  }
  private resize() {
    const w = this.stage.clientWidth,
      h = this.stage.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.positionCamera();
  }
  selectRoom(id: string) {
    this.roomId = id;
    for (const m of this.floors)
      m.material =
        m.userData.roomId === id
          ? this.material.selected
          : roomFor(m.userData.roomId).zone === "室外"
            ? this.material.paving
            : this.material.floor;
    for (const l of this.labels)
      l.el.classList.toggle("active", l.room.id === id);
    if (this.focused) this.positionCamera();
  }
  setFurniture(items: Furniture[]) {
    this.items = items;
    for (const g of this.furniture.values())
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    this.furnitureRoot.clear();
    this.furniture.clear();
    for (const f of items) {
      const g = this.makeFurniture(f);
      g.userData.furnitureId = f.id;
      g.position.set(f.x - SITE.width / 2, 0.115, f.z - SITE.depth / 2);
      g.rotation.y = THREE.MathUtils.degToRad(f.rotation);
      this.furniture.set(f.id, g);
      this.furnitureRoot.add(g);
    }
    this.selectFurniture(this.selectedId);
  }
  selectFurniture(id: string | null) {
    this.selectedId = id;
    const f = this.items.find((i) => i.id === id);
    this.outline.visible = !!f && this.view !== "outside";
    if (f) {
      this.outline.scale.set(f.width + 0.09, 1, f.depth + 0.09);
      this.outline.rotation.y = THREE.MathUtils.degToRad(f.rotation);
      this.outline.position.set(
        f.x - SITE.width / 2,
        0.13,
        f.z - SITE.depth / 2,
      );
    }
  }
  private makeFurniture(f: Furniture) {
    const g = new THREE.Group(),
      w = f.width,
      d = f.depth,
      h = f.height;
    const part = (
      x: number,
      y: number,
      z: number,
      pw: number,
      ph: number,
      pd: number,
      mat = "wood",
    ) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(0.015, pw),
          Math.max(0.015, ph),
          Math.max(0.015, pd),
        ),
        this.material[mat],
      );
      m.position.set(x, y + ph / 2, z);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const legs = (top: number) => {
      for (const x of [-w / 2 + 0.06, w / 2 - 0.06])
        for (const z of [-d / 2 + 0.06, d / 2 - 0.06])
          part(x, 0, z, 0.07, top, 0.07, "darkwood");
    };
    if (["tea", "desk", "dining", "stool"].includes(f.kind)) {
      legs(h - 0.08);
      part(0, h - 0.09, 0, w, 0.09, d);
      part(0, h - 0.18, 0, w - 0.1, 0.1, d - 0.1, "darkwood");
    } else if (f.kind === "bed") {
      legs(0.22);
      part(0, 0.16, 0, w, 0.18, d);
      part(0, 0.34, 0, w - 0.04, 0.18, d - 0.08, "ceramic");
      part(0, 0.52, d * 0.15, w - 0.07, 0.06, d * 0.62, "fabric");
      part(0, 0.2, -d / 2 + 0.055, w, 0.85 * (h - 0.2), 0.11, "darkwood");
      part(0, 0.35, -d / 2 + 0.12, w - 0.15, 0.45 * (h - 0.2), 0.06);
      for (const x of [-w * 0.24, w * 0.24])
        part(x, 0.53, -d * 0.3, w * 0.4, 0.09, d * 0.2, "ceramic");
    } else if (["sofa", "armchair"].includes(f.kind)) {
      legs(h * 0.35);
      part(0, h * 0.3, 0, w, 0.1, d);
      part(0, h * 0.4, 0, w - 0.16, h * 0.13, d - 0.1, "fabric");
      part(0, h * 0.37, -d / 2 + 0.06, w, 0.62 * h, 0.1, "darkwood");
      part(0, h * 0.48, -d / 2 + 0.13, w - 0.2, 0.4 * h, 0.12, "fabric");
      for (const x of [-w / 2 + 0.055, w / 2 - 0.055]) {
        part(x, h * 0.4, 0, 0.08, h * 0.36, d);
        part(x, h * 0.74, 0, 0.12, 0.06, d);
      }
      if (f.kind === "sofa")
        for (const x of [-w / 6, w / 6])
          part(x, h * 0.54, 0, 0.013, 0.02, d * 0.72, "darkwood");
    } else if (f.kind === "bookshelf") {
      part(0, 0, -d / 2 + 0.025, w, h, 0.05, "darkwood");
      for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) part(x, 0, 0, 0.08, h, d);
      for (let i = 0; i < 5; i++) part(0, (h * i) / 4, 0, w, 0.06, d);
      for (let i = 0; i < 9; i++)
        part(
          -w * 0.38 + i * w * 0.083,
          h * 0.27,
          -0.015,
          w * 0.04,
          h * (0.11 + (i % 3) * 0.018),
          d * 0.64,
          i % 3 === 0 ? "fabric" : "wood",
        );
    } else if (["wardrobe", "cabinet"].includes(f.kind)) {
      legs(0.09);
      part(0, 0.07, 0, w, h - 0.07, d, "darkwood");
      for (const x of [-w / 4, w / 4]) {
        part(x, 0.1, d / 2 + 0.008, w / 2 - 0.025, h - 0.14, 0.035);
        part(
          x + (x < 0 ? 1 : -1) * w * 0.16,
          h * 0.49,
          d / 2 + 0.035,
          0.018,
          h * 0.12,
          0.025,
          "frame",
        );
      }
    } else if (f.kind === "basin") {
      part(0, 0, 0, w, h - 0.12, d);
      part(0, h - 0.12, 0, w, 0.12, d, "ceramic");
      part(0, h - 0.11, -d * 0.05, w * 0.6, 0.125, d * 0.5, "glass");
    } else {
      part(0, 0, 0, w, h, d);
    }
    // All geometry stays inside the user-editable footprint except tiny handles.
    return g;
  }
  private cast(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      ),
      this.camera,
    );
  }
  private point(e: PointerEvent) {
    this.cast(e);
    return this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
  }
  private onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.down = [e.clientX, e.clientY];
    if (this.view === "outside") return;
    this.cast(e);
    const hit = this.ray.intersectObjects(
      [...this.furniture.values()],
      true,
    )[0];
    if (!hit) return;
    let o: THREE.Object3D | null = hit.object;
    while (o && !o.userData.furnitureId) o = o.parent;
    const f = this.items.find((i) => i.id === o?.userData.furnitureId);
    if (!f) return;
    const p = this.point(e);
    if (!p) return;
    this.callbacks.furniture(f.id);
    this.controls.enabled = false;
    this.pointerId = e.pointerId;
    this.dragging = {
      id: f.id,
      offset: p
        .clone()
        .sub(
          new THREE.Vector3(f.x - SITE.width / 2, 0.115, f.z - SITE.depth / 2),
        ),
      start: structuredClone(f),
    };
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.stage.classList.add("dragging");
    e.stopImmediatePropagation();
  };
  private onMove = (e: PointerEvent) => {
    if (!this.dragging || this.pointerId !== e.pointerId) return;
    const p = this.point(e),
      f = this.items.find((i) => i.id === this.dragging!.id);
    if (!p || !f) return;
    const snapped = (n: number) => (e.altKey ? n : Math.round(n * 20) / 20);
    const next = clampPlacement(
      {
        ...f,
        x: snapped(p.x - this.dragging.offset.x + SITE.width / 2),
        z: snapped(p.z - this.dragging.offset.z + SITE.depth / 2),
      },
      roomFor(f.roomId),
    );
    if (!next) return;
    Object.assign(f, next);
    const g = this.furniture.get(f.id)!;
    g.position.set(f.x - SITE.width / 2, 0.115, f.z - SITE.depth / 2);
    this.selectFurniture(f.id);
    this.callbacks.move({ ...f }, false);
    e.stopImmediatePropagation();
  };
  private finishDrag(cancel: boolean) {
    if (!this.dragging) return;
    const f = cancel
      ? this.dragging.start
      : this.items.find((i) => i.id === this.dragging!.id);
    this.dragging = null;
    this.pointerId = null;
    this.controls.enabled = true;
    this.stage.classList.remove("dragging");
    if (f) {
      const g = this.furniture.get(f.id);
      g?.position.set(f.x - SITE.width / 2, 0.115, f.z - SITE.depth / 2);
      this.callbacks.move({ ...f }, true);
    }
  }
  private onUp = (e: PointerEvent) => {
    if (this.dragging) {
      this.finishDrag(false);
      e.stopImmediatePropagation();
      return;
    }
    if (
      this.view === "outside" ||
      !this.down ||
      Math.hypot(e.clientX - this.down[0], e.clientY - this.down[1]) > 5
    )
      return;
    this.cast(e);
    const hit = this.ray.intersectObjects(this.floors)[0];
    if (hit) this.callbacks.room(hit.object.userData.roomId);
  };
  private onCancel = () => this.finishDrag(true);
  private onLostCapture = () => this.finishDrag(false);
  private draw = () => {
    requestAnimationFrame(this.draw);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    const w = this.stage.clientWidth,
      h = this.stage.clientHeight,
      p = new THREE.Vector3(),
      occupied: { x: number; y: number; w: number; h: number }[] = [];
    const ordered = [...this.labels].sort(
      (a, b) =>
        Number(b.room.id === this.roomId) - Number(a.room.id === this.roomId),
    );
    for (const l of ordered) {
      p.copy(l.p).project(this.camera);
      let show =
        this.showLabels &&
        this.view !== "outside" &&
        (!this.focused || l.room.id === this.roomId) &&
        p.z < 1 &&
        Math.abs(p.x) < 0.94 &&
        Math.abs(p.y) < 0.9;
      const x = ((p.x + 1) * w) / 2,
        y = ((1 - p.y) * h) / 2,
        bw = l.room.name.length * 12 + 20,
        bh = 26;
      if (
        show &&
        occupied.some(
          (b) =>
            Math.abs(x - b.x) < (bw + b.w) / 2 + 3 &&
            Math.abs(y - b.y) < (bh + b.h) / 2 + 3,
        )
      )
        show = false;
      l.el.hidden = !show;
      l.el.style.left = `${x}px`;
      l.el.style.top = `${y}px`;
      if (show) occupied.push({ x, y, w: bw, h: bh });
    }
  };
}
