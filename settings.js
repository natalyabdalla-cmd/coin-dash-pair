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
  // The collectible is an amethyst gem that pulses every gemPulseMs and throws off
  // a twinkle every sparkleEveryMs, each lasting sparkleFadeMs.
  gemPulseMs: 650,
  sparkleEveryMs: 280,
  sparkleFadeMs: 560,
  colors: {
    background: 0x101c31, player: 0x71e8ce, drone: 0xff657a,
    gem: { light: 0xf3d4ff, mid: 0xc77dff, dark: 0x7b2cbf, outline: 0xfbeaff, sparkle: 0xffffff }
  }
};
