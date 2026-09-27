import test from "node:test";
import assert from "node:assert/strict";
import {
  ROOMS,
  emptyProject,
  clampPlacement,
  roomFor,
  overlap,
  findSpot,
  validateProject,
  type Furniture,
} from "../src/model.ts";
const item = (patch: Partial<Furniture> = {}): Furniture => ({
  id: "one",
  roomId: "living",
  kind: "desk",
  name: "书案",
  x: 6,
  z: 6,
  rotation: 0,
  width: 1.4,
  depth: 0.65,
  height: 0.76,
  photos: [],
  ...patch,
});
test("bounds use the rotated footprint and cannot pass through room edges", () => {
  const placed = clampPlacement(
    item({ x: -100, z: 100, rotation: 45 }),
    roomFor("living"),
  )!;
  const r = roomFor("living").bounds;
  const radius = (1.4 + 0.65) / Math.sqrt(2) / 2;
  assert.ok(placed.x - radius >= r[0]);
  assert.ok(placed.z + radius <= r[3]);
});
test("oversized furniture is rejected, never silently scaled", () => {
  assert.equal(clampPlacement(item({ width: 4 }), roomFor("master")), null);
});
test("OBB collision detects overlap and respects room ownership", () => {
  assert.equal(
    overlap(item(), item({ id: "two", x: 6.2, rotation: 35 })),
    true,
  );
  assert.equal(overlap(item(), item({ id: "two", x: 9 })), false);
  assert.equal(overlap(item(), item({ roomId: "north" })), false);
});
test("new furniture finds separate floor space", () => {
  const a = findSpot(item(), [])!;
  const b = findSpot(item({ id: "two" }), [a])!;
  assert.equal(overlap(a, b), false);
});
test("photos round-trip independently for rooms and individual furniture", () => {
  const p = emptyProject();
  p.roomPhotos.living = [
    { id: "r", name: "room.jpg", data: "data:image/jpeg;base64,YWJj" },
  ];
  p.furniture = [
    item({
      photos: [
        { id: "f", name: "desk.jpg", data: "data:image/jpeg;base64,ZA==" },
      ],
    }),
  ];
  const q = validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(q.roomPhotos.living[0].id, "r");
  assert.equal(q.furniture[0].photos[0].id, "f");
  assert.notEqual(q.roomPhotos.living, q.furniture[0].photos);
});
test("import rejects script URLs, duplicate IDs, unsupported rooms and invalid sizes", () => {
  const p = emptyProject();
  p.roomPhotos.living = [{ id: "x", name: "x", data: "javascript:alert(1)" }];
  assert.throws(() => validateProject(p));
  p.roomPhotos = {};
  p.furniture = [item(), item()];
  assert.throws(() => validateProject(p));
  p.furniture = [item({ roomId: "stairs" })];
  assert.throws(() => validateProject(p));
  p.furniture = [item({ width: Infinity })];
  assert.throws(() => validateProject(p));
});
test("import clamps valid furniture into its assigned room", () => {
  const p = emptyProject();
  p.furniture = [item({ x: 999, z: -999 })];
  const q = validateProject(p);
  assert.ok(q.furniture[0].x < 9.36);
  assert.ok(q.furniture[0].z > 3.91);
});
test("the east space is flat circulation, with no stair room", () => {
  assert.ok(ROOMS.some((r) => r.id === "east" && r.name === "东侧过道"));
  assert.ok(!ROOMS.some((r) => /楼梯|stairs/.test(r.id + r.name)));
});
