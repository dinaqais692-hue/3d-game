// Pre-generated building data — deterministic using a seeded LCG
// so Math.random() is never called during render.

export interface Building {
  x: number; z: number;
  width: number; depth: number; height: number;
  color: string;
  minX: number; maxX: number;
  minZ: number; maxZ: number;
}

function makeLCG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const BUILDING_COLORS = [
  "#5a6472","#4a5568","#718096","#8a9bb0","#6b7280",
  "#c0392b","#2980b9","#27ae60","#8e44ad","#d35400",
];

const NUM_BUILDINGS = 40;
const WORLD_HALF = 90;
const SPAWN_CLEAR_RADIUS = 15;

export function generateBuildings(): Building[] {
  const rng = makeLCG(42);
  const buildings: Building[] = [];

  for (let i = 0; i < NUM_BUILDINGS; i++) {
    let x = 0, z = 0, tries = 0;
    do {
      x = (rng() * 2 - 1) * WORLD_HALF;
      z = (rng() * 2 - 1) * WORLD_HALF;
      tries++;
    } while (
      tries < 20 &&
      Math.abs(x) < SPAWN_CLEAR_RADIUS &&
      Math.abs(z) < SPAWN_CLEAR_RADIUS
    );

    const width  = 4 + rng() * 8;
    const depth  = 4 + rng() * 8;
    const height = 3 + rng() * 20;
    const color  = BUILDING_COLORS[Math.floor(rng() * BUILDING_COLORS.length)];

    buildings.push({
      x, z, width, depth, height, color,
      minX: x - width / 2, maxX: x + width / 2,
      minZ: z - depth / 2, maxZ: z + depth / 2,
    });
  }

  return buildings;
}

export const BUILDINGS = generateBuildings();
