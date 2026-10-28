/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.lives = c.lives;
    this.invulnerableUntil = 0;
    this.started = false;
    this.finished = false;
    this.paused = false;
    this.best = loadBest();
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    // The coin is an invisible hitbox; the gem visuals live in a container that follows it,
    // so the pulse tween never touches the physics body.
    this.coin = this.add.circle(100, 100, 9, 0xffffff, 0);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.makeGemTextures();
    this.gem = this.add.image(0, 0, 'gem');
    this.gemFx = this.add.container(100, 100, [this.gem]);
    this.tweens.add({
      targets: this.gem, scale: 1.12, duration: c.gemPulseMs,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    this.sparkleTimer = this.time.addEvent({ delay: c.sparkleEveryMs, loop: true, callback: () => this.sparkle() });
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      drone.angle0 = (35 + i * 105) * Math.PI / 180;
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (!this.started || this.finished) return;
      this.score++;
      playTone(880, 0.08, 'square');
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.loseLife());
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R,P');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.muteText = this.add.text(c.width - 12, c.height - 10, '', { font: '14px monospace', color: '#ffffff' })
      .setOrigin(1, 1).setDepth(10);
    this.updateMuteText();
    this.input.keyboard.on('keydown-M', () => {
      muted = !muted;
      this.updateMuteText();
    });
    this.pauseOverlay = this.add.container(c.width / 2, c.height / 2, [
      this.add.rectangle(0, 0, 460, 120, 0x0a1120, 0.95),
      this.add.text(0, 0, 'Paused\nPress P to resume',
        { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }).setOrigin(0.5)
    ]).setVisible(false).setDepth(10);
    this.difficultyMenu = this.add.container(c.width / 2, c.height / 2, [
      this.add.rectangle(0, 0, 460, 200, 0x0a1120, 0.95),
      this.add.text(0, 0,
        'Choose difficulty\n' + c.difficulties.map((d, i) => `${i + 1} - ${d.name}`).join('\n'),
        { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }).setOrigin(0.5)
    ]).setDepth(10);
    this.hud.setText('Press 1, 2 or 3 to start');
    this.input.keyboard.on('keydown', (event) => {
      unlockAudio();
      const level = c.difficulties[Number(event.key) - 1];
      if (level && !this.started) this.startRound(level);
    });
  }

  startRound(level) {
    const c = COIN_DASH;
    this.started = true;
    this.difficulty = level;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.drones.getChildren().forEach((drone) => drone.body.setVelocity(
      Math.cos(drone.angle0) * level.droneSpeed, Math.sin(drone.angle0) * level.droneSpeed));
    this.difficultyMenu.setVisible(false);
  }

  updateMuteText() {
    this.muteText.setText(muted ? 'Sound: off (M)' : 'Sound: on (M)');
  }

  togglePause() {
    if (!this.started || this.finished) return;
    this.paused = !this.paused;
    if (this.paused) {
      // Freeze the countdown by remembering how much time was left.
      // The hit grace period and its blink freeze the same way, as do the gem's sparkles.
      this.remaining = this.deadline - this.time.now;
      this.graceRemaining = Math.max(0, this.invulnerableUntil - this.time.now);
      this.physics.pause();
      this.tweens.pauseAll();
    } else {
      this.deadline = this.time.now + this.remaining;
      this.invulnerableUntil = this.time.now + this.graceRemaining;
      this.physics.resume();
      this.tweens.resumeAll();
    }
    this.sparkleTimer.paused = this.paused;
    this.pauseOverlay.setVisible(this.paused);
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
    this.gemFx.setPosition(x, y);
  }

  makeGemTextures() {
    // Textures are global, so only draw them once (scene.restart runs create again).
    if (this.textures.exists('gem')) return;
    const g = COIN_DASH.colors.gem;
    const P = (x, y) => new Phaser.Math.Vector2(x, y);
    const gfx = this.add.graphics();
    // Brilliant cut on a 26x26 canvas: table on top, girdle across, pavilion down to a point.
    const facets = [
      [g.light, [P(8, 4), P(18, 4), P(13, 10)]],
      [g.mid, [P(2, 10), P(8, 4), P(13, 10)]],
      [g.mid, [P(18, 4), P(24, 10), P(13, 10)]],
      [g.mid, [P(2, 10), P(13, 10), P(13, 24)]],
      [g.dark, [P(13, 10), P(24, 10), P(13, 24)]]
    ];
    facets.forEach(([color, points]) => gfx.fillStyle(color, 1).fillPoints(points, true));
    gfx.lineStyle(1.5, g.outline, 1)
      .strokePoints([P(8, 4), P(18, 4), P(24, 10), P(13, 24), P(2, 10)], true);
    gfx.generateTexture('gem', 26, 26);
    // Four-point twinkle star.
    gfx.clear().fillStyle(g.sparkle, 1).fillPoints([
      P(5, 0), P(6, 4), P(10, 5), P(6, 6), P(5, 10), P(4, 6), P(0, 5), P(4, 4)
    ], true);
    gfx.generateTexture('sparkle', 10, 10);
    gfx.destroy();
  }

  sparkle() {
    // A glint pops in somewhere around the gem, then shrinks and fades away.
    const angle = Math.random() * Math.PI * 2;
    const r = Phaser.Math.Between(8, 15);
    const glint = this.add.image(Math.cos(angle) * r, Math.sin(angle) * r, 'sparkle')
      .setScale(0.2).setAngle(Phaser.Math.Between(0, 45));
    this.gemFx.add(glint);
    this.tweens.add({
      targets: glint, scale: { from: 0.2, to: 1 }, duration: COIN_DASH.sparkleFadeMs / 2,
      yoyo: true, ease: 'Sine.easeOut', onComplete: () => glint.destroy()
    });
    this.tweens.add({ targets: glint, alpha: 0, delay: COIN_DASH.sparkleFadeMs / 2,
      duration: COIN_DASH.sparkleFadeMs / 2 });
  }

  loseLife() {
    // Overlap fires every frame while touching, so ignore hits during the grace period.
    if (!this.started || this.finished || this.time.now < this.invulnerableUntil) return;
    this.lives--;
    if (this.lives <= 0) {
      this.finish('A drone caught you!');
      return;
    }
    playTone(110, 0.25, 'sawtooth');
    this.invulnerableUntil = this.time.now + COIN_DASH.hitGraceMs;
    this.tweens.add({
      targets: this.player, alpha: 0.25, duration: 125, yoyo: true,
      repeat: Math.floor(COIN_DASH.hitGraceMs / 250) - 1,
      onComplete: () => this.player.setAlpha(1)
    });
  }

  update() {
    if (!this.started || this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    const best = Math.max(this.best, this.score);
    this.hud.setText(`Coins: ${this.score}    Lives: ${this.lives}    Best: ${best}    Time: ${seconds}s    ${this.difficulty.name}`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    playTone(392, 0.25, 'triangle');
    playTone(294, 0.25, 'triangle', 0.25);
    playTone(196, 0.5, 'triangle', 0.5);
    const newBest = this.score > this.best;
    if (newBest) {
      this.best = this.score;
      saveBest(this.best);
    }
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 190, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\n${newBest ? 'New high score!' : `High score: ${this.best}`}\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
// Sound effects are synthesized with the Web Audio API, so no audio files are needed.
// Kept outside the scene so the mute setting survives a restart.
let audioCtx = null;
let muted = false;
function unlockAudio() {
  // Browsers only allow audio after a user gesture, so start it from a key press.
  if (!audioCtx && window.AudioContext) audioCtx = new AudioContext();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function playTone(freq, duration, type, delay = 0) {
  if (muted || !audioCtx) return;
  const start = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration);
}
// localStorage can be unavailable (e.g. privacy settings), so fail quietly.
const BEST_KEY = 'coinDash.highScore';
function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(score) {
  try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* ignore */ }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
