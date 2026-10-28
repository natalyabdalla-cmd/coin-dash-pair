// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  // Chosen with keys 1, 2, 3 before the round starts.
  difficulties: [
    { name: 'Easy', droneSpeed: 70 },
    { name: 'Medium', droneSpeed: 105 },
    { name: 'Hard', droneSpeed: 150 }
  ],
  droneCount: 3,
  lives: 3,
  hitGraceMs: 1500,
  // Hitbox radius stays fixed; spinMs is one full turn of the coin's squash animation.
  coin: { radius: 9, spinMs: 900 },
  colors: {
    background: 0x101c31, player: 0x71e8ce, drone: 0xff657a,
    coin: 0xf5c542, coinRim: 0xb07d12, coinShine: 0xfff4c2
  }
};
