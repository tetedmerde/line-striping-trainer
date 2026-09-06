import { Game, bindHud } from './game/Game.js';

const canvas = document.getElementById('game');
const hud = bindHud();
const game = new Game(canvas, hud);

document.querySelectorAll('.mission-btn').forEach((btn) => {
  btn.addEventListener('click', () => game.setMission(Number(btn.dataset.mission)));
});

document.querySelectorAll('.swatch').forEach((btn) => {
  btn.addEventListener('click', () => game.setColor(btn.dataset.color));
});

const splash = document.getElementById('title-splash');
const startBtn = document.getElementById('start-btn');

async function boot() {
  try {
    await game.load();
    // Share paint canvas as Three texture source
    if (game.world?.paintTex) {
      game.world.paintTex.image = game.paint.canvas;
      game.world.paintTex.needsUpdate = true;
    }
  } catch (err) {
    console.error(err);
    hud.toast('Failed to load 3D world / plan');
  }
  game.resize();
  game.start();
}

startBtn.addEventListener('click', () => {
  splash.classList.add('hidden');
});

splash.addEventListener('click', (e) => {
  if (e.target === splash || e.target === startBtn || e.target.closest('.splash-card')) {
    splash.classList.add('hidden');
  }
});

boot();
