// Module-level mutable game state — shared between game loop and HUD
// without React re-renders for maximum performance

export const gameState = {
  playerPos: { x: 0, y: 0, z: 0 },
  playerAngle: 0,
  health: 100,
  inCar: false,
  carPos: { x: 8, y: 0, z: 0 },
  carAngle: 0,
  showEnterPrompt: false,
  showExitPrompt: false,
};
