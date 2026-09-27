export const SITE = { width: 12.96, depth: 18.3, height: 3.3 };
export type Room = {
  id: string;
  name: string;
  zone: string;
  bounds: [number, number, number, number];
  note: string;
};
export const ROOMS: Room[] = [
  {
    id: "study",
    name: "书房",
    zone: "北侧主屋",
    bounds: [0.37, 0.37, 3.36, 3.67],
    note: "北侧开窗；用途按图纸标注。",
  },
  {
    id: "north",
    name: "北侧房间",
    zone: "北侧主屋",
    bounds: [3.6, 0.37, 9.36, 3.67],
    note: "原图未标用途，保留为空间。",
  },
  {
    id: "bed-ne",
    name: "东北次卧",
    zone: "北侧主屋",
    bounds: [9.6, 0.37, 12.59, 3.67],
    note: "图纸右上侧卧。",
  },
  {
    id: "bath",
    name: "卫生间",
    zone: "北侧主屋",
    bounds: [0.37, 3.91, 2.24, 5.11],
    note: "按图纸西侧小间，隔墙尺寸暂估。",
  },
  {
    id: "master",
    name: "主卧",
    zone: "北侧主屋",
    bounds: [0.37, 5.35, 3.36, 9.45],
    note: "图纸标注净进深约 4.10 米。",
  },
  {
    id: "living",
    name: "客厅",
    zone: "北侧主屋",
    bounds: [3.6, 3.91, 9.36, 9.45],
    note: "图中净宽 4.76 米与顶部开间不一致，当前按整体开间定位，待复核。",
  },
  {
    id: "bed-se",
    name: "东南次卧",
    zone: "北侧主屋",
    bounds: [9.6, 6.23, 12.59, 9.45],
    note: "沿用图纸房间关系，局部分隔位置待复核。",
  },
  {
    id: "east",
    name: "东侧过道",
    zone: "北侧主屋",
    bounds: [9.6, 3.91, 12.59, 5.99],
    note: "保持平地，不设置楼梯或额外结构。",
  },
  {
    id: "south",
    name: "南侧附房",
    zone: "南侧附房",
    bounds: [3.12, 15.12, 9.12, 17.93],
    note: "进深按图纸 3.30 米；用途未标明。",
  },
  {
    id: "service-n",
    name: "辅助间一",
    zone: "南侧附房",
    bounds: [0.37, 15.12, 1.62, 16.44],
    note: "南侧西端原图小间。",
  },
  {
    id: "service-s",
    name: "辅助间二",
    zone: "南侧附房",
    bounds: [0.37, 16.56, 1.62, 17.93],
    note: "南侧西端原图小间。",
  },
  {
    id: "service",
    name: "附房过道",
    zone: "南侧附房",
    bounds: [1.74, 15.12, 2.88, 17.93],
    note: "连接南侧辅助间。",
  },
  {
    id: "yard",
    name: "院子",
    zone: "室外",
    bounds: [0.37, 10.97, 12.59, 14.86],
    note: "院落分段尺寸存在闭合差异，位置为暂定。",
  },
  {
    id: "entrance",
    name: "入户通道",
    zone: "室外",
    bounds: [9.48, 15.12, 12.59, 17.8],
    note: "东南入口，图纸门洞 2.60 米。",
  },
];
export type Kind =
  | "sofa"
  | "armchair"
  | "tea"
  | "bed"
  | "wardrobe"
  | "desk"
  | "dining"
  | "bookshelf"
  | "cabinet"
  | "stool"
  | "basin"
  | "custom";
export type CatalogItem = {
  kind: Kind;
  name: string;
  icon: string;
  width: number;
  depth: number;
  height: number;
  category: string;
};
export const CATALOG: CatalogItem[] = [
  {
    kind: "sofa",
    name: "实木沙发",
    icon: "sofa",
    width: 2.3,
    depth: 0.86,
    height: 0.86,
    category: "客厅",
  },
  {
    kind: "armchair",
    name: "实木圈椅",
    icon: "armchair",
    width: 0.68,
    depth: 0.68,
    height: 0.9,
    category: "客厅",
  },
  {
    kind: "tea",
    name: "实木茶几",
    icon: "rectangle-horizontal",
    width: 1.2,
    depth: 0.65,
    height: 0.45,
    category: "客厅",
  },
  {
    kind: "bed",
    name: "实木双人床",
    icon: "bed-double",
    width: 1.8,
    depth: 2.1,
    height: 1.05,
    category: "卧室",
  },
  {
    kind: "wardrobe",
    name: "实木衣柜",
    icon: "panels-top-left",
    width: 1.6,
    depth: 0.58,
    height: 2.2,
    category: "卧室",
  },
  {
    kind: "desk",
    name: "实木书案",
    icon: "table-2",
    width: 1.4,
    depth: 0.65,
    height: 0.76,
    category: "书房",
  },
  {
    kind: "bookshelf",
    name: "实木书柜",
    icon: "library-big",
    width: 1.2,
    depth: 0.34,
    height: 2,
    category: "书房",
  },
  {
    kind: "dining",
    name: "实木餐桌",
    icon: "table",
    width: 1.5,
    depth: 0.85,
    height: 0.76,
    category: "客厅",
  },
  {
    kind: "cabinet",
    name: "实木矮柜",
    icon: "archive",
    width: 1.2,
    depth: 0.42,
    height: 0.65,
    category: "收纳",
  },
  {
    kind: "stool",
    name: "实木方凳",
    icon: "square",
    width: 0.4,
    depth: 0.4,
    height: 0.45,
    category: "其他",
  },
  {
    kind: "basin",
    name: "洗手台",
    icon: "bath",
    width: 0.65,
    depth: 0.45,
    height: 0.85,
    category: "其他",
  },
  {
    kind: "custom",
    name: "自定义家具",
    icon: "box",
    width: 1,
    depth: 0.6,
    height: 0.8,
    category: "其他",
  },
];
export type Photo = { id: string; name: string; data: string };
export type Furniture = {
  id: string;
  roomId: string;
  kind: Kind;
  name: string;
  x: number;
  z: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  photos: Photo[];
};
export type Project = {
  version: 1;
  name: string;
  furniture: Furniture[];
  roomPhotos: Record<string, Photo[]>;
  updatedAt: string;
};
export const emptyProject = (): Project => ({
  version: 1,
  name: "我的宅基地",
  furniture: [],
  roomPhotos: {},
  updatedAt: new Date().toISOString(),
});
export function roomFor(id: string) {
  return ROOMS.find((r) => r.id === id)!;
}
export function footprint(
  item: Pick<Furniture, "width" | "depth" | "rotation">,
) {
  const a = (item.rotation * Math.PI) / 180;
  return {
    w: Math.abs(Math.cos(a)) * item.width + Math.abs(Math.sin(a)) * item.depth,
    d: Math.abs(Math.sin(a)) * item.width + Math.abs(Math.cos(a)) * item.depth,
  };
}
export function clampPlacement(item: Furniture, room: Room): Furniture | null {
  const b = room.bounds,
    { w, d } = footprint(item),
    pad = 0.035;
  if (w > b[2] - b[0] - pad * 2 || d > b[3] - b[1] - pad * 2) return null;
  return {
    ...item,
    x: Math.max(b[0] + w / 2 + pad, Math.min(b[2] - w / 2 - pad, item.x)),
    z: Math.max(b[1] + d / 2 + pad, Math.min(b[3] - d / 2 - pad, item.z)),
  };
}
export function overlap(a: Furniture, b: Furniture) {
  if (a.roomId !== b.roomId) return false;
  const axes = [a.rotation, b.rotation].flatMap((r) => {
    const q = (r * Math.PI) / 180;
    return [
      [Math.cos(q), -Math.sin(q)],
      [Math.sin(q), Math.cos(q)],
    ];
  });
  const corners = (f: Furniture) => {
    const q = (f.rotation * Math.PI) / 180;
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ].map(([x, z]) => [
      f.x +
        ((x * f.width) / 2) * Math.cos(q) +
        ((z * f.depth) / 2) * Math.sin(q),
      f.z -
        ((x * f.width) / 2) * Math.sin(q) +
        ((z * f.depth) / 2) * Math.cos(q),
    ]);
  };
  const ac = corners(a),
    bc = corners(b);
  return axes.every(([x, z]) => {
    const ap = ac.map((p) => p[0] * x + p[1] * z),
      bp = bc.map((p) => p[0] * x + p[1] * z);
    return (
      Math.min(Math.max(...ap), Math.max(...bp)) -
        Math.max(Math.min(...ap), Math.min(...bp)) >
      0.025
    );
  });
}
export function findSpot(item: Furniture, items: Furniture[]) {
  const r = roomFor(item.roomId),
    [x1, z1, x2, z2] = r.bounds;
  for (let z = z1 + item.depth / 2 + 0.05; z < z2; z += 0.15)
    for (let x = x1 + item.width / 2 + 0.05; x < x2; x += 0.15) {
      const p = clampPlacement({ ...item, x, z }, r);
      if (p && !items.some((v) => overlap(p, v))) return p;
    }
  return null;
}
export function validateProject(raw: unknown): Project {
  if (!raw || typeof raw !== "object") throw Error("这不是有效的方案文件");
  const p = raw as Project;
  if (
    p.version !== 1 ||
    !Array.isArray(p.furniture) ||
    !p.roomPhotos ||
    typeof p.roomPhotos !== "object" ||
    p.furniture.length > 500
  )
    throw Error("方案格式不受支持");
  const ids = new Set<string>();
  const photos = (arr: unknown): Photo[] => {
    if (!Array.isArray(arr) || arr.length > 30) throw Error("照片列表无效");
    return arr.map((v) => {
      if (
        !v ||
        typeof v.data !== "string" ||
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v.data) ||
        v.data.length > 6000000
      )
        throw Error("照片格式无效");
      return {
        id: String(v.id).slice(0, 80),
        name: String(v.name).slice(0, 120),
        data: v.data,
      };
    });
  };
  const furniture = p.furniture.map((f) => {
    if (
      !f ||
      !ROOMS.some((r) => r.id === f.roomId) ||
      !CATALOG.some((c) => c.kind === f.kind) ||
      typeof f.id !== "string" ||
      ids.has(f.id) ||
      ![f.x, f.z, f.rotation, f.width, f.depth, f.height].every(
        Number.isFinite,
      ) ||
      [f.width, f.depth, f.height].some((n) => n < 0.1 || n > 8)
    )
      throw Error("家具参数无效");
    ids.add(f.id);
    const safe = {
      ...f,
      name: String(f.name).slice(0, 60),
      rotation: ((f.rotation % 360) + 360) % 360,
      photos: photos(f.photos),
    };
    const bounded = clampPlacement(safe, roomFor(f.roomId));
    if (!bounded) throw Error("方案中的家具体积超出了房间");
    return bounded;
  });
  const roomPhotos: Record<string, Photo[]> = {};
  for (const r of ROOMS)
    if (p.roomPhotos[r.id]) roomPhotos[r.id] = photos(p.roomPhotos[r.id]);
  return {
    version: 1,
    name: typeof p.name === "string" ? p.name.slice(0, 60) : "我的宅基地",
    furniture,
    roomPhotos,
    updatedAt: new Date().toISOString(),
  };
}
