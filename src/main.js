import { MISSIONS, PASS_THRESHOLD } from './game/missions.js';
import { StripingGame } from './game/engine.js';

const app = document.getElementById('app');

const state = {
  screen: 'start',
  missionId: 1,
  mode: 'practice', // practice | test
  game: null,
  lastResults: null,
};

function render() {
  if (state.game) {
    state.game.destroy();
    state.game = null;
  }

  switch (state.screen) {
    case 'start':
      app.innerHTML = startScreen();
      bindStart();
      break;
    case 'select':
      app.innerHTML = selectScreen();
      bindSelect();
      break;
    case 'game':
      app.innerHTML = gameScreen();
      bindGame();
      break;
    case 'results':
      app.innerHTML = resultsScreen();
      bindResults();
      break;
    default:
      app.innerHTML = startScreen();
      bindStart();
  }
}

function startScreen() {
  return `
    <section class="screen panel-screen active">
      <div class="card">
        <div class="badge-row">
          <span class="badge">Training Simulator</span>
          <span class="badge">Parking Lot Striping</span>
        </div>
        <h1>Line Striping Trainer</h1>
        <p class="subtitle">
          Practice painting stall lines, ADA markings, arrows, stop bars, and
          crosswalks on a retail-style lot layout. Follow the guides, choose the
          correct paint color, and meet the accuracy standard before you hit the field.
        </p>
        <div class="btn-row">
          <button class="btn btn-primary" id="btn-start">Start Training</button>
        </div>
      </div>
    </section>
  `;
}

function bindStart() {
  document.getElementById('btn-start').onclick = () => {
    state.screen = 'select';
    render();
  };
}

function selectScreen() {
  const cards = MISSIONS.map(
    (m) => `
    <button type="button" class="mission-card ${state.missionId === m.id ? 'selected' : ''}" data-id="${m.id}">
      <div class="mission-num">${m.id}</div>
      <div>
        <h3>${m.title}</h3>
        <p>${m.description}</p>
      </div>
      <span class="badge">${m.allowedColors.join(' · ')}</span>
    </button>
  `
  ).join('');

  return `
    <section class="screen panel-screen active">
      <div class="card">
        <h1>Select Mission</h1>
        <p class="subtitle">Choose a scenario and training mode. Practice shows clear guides; Test fades them as you progress.</p>

        <div class="mode-toggle" role="group" aria-label="Training mode">
          <button type="button" class="btn btn-secondary ${state.mode === 'practice' ? 'active' : ''}" data-mode="practice">Practice</button>
          <button type="button" class="btn btn-secondary ${state.mode === 'test' ? 'active' : ''}" data-mode="test">Test</button>
        </div>

        <div class="mission-list">${cards}</div>

        <div class="btn-row">
          <button class="btn btn-secondary" id="btn-back-start">Back</button>
          <button class="btn btn-primary" id="btn-launch">Begin Mission</button>
        </div>
      </div>
    </section>
  `;
}

function bindSelect() {
  document.querySelectorAll('.mission-card').forEach((el) => {
    el.onclick = () => {
      state.missionId = Number(el.dataset.id);
      render();
    };
  });
  document.querySelectorAll('[data-mode]').forEach((el) => {
    el.onclick = () => {
      state.mode = el.dataset.mode;
      render();
    };
  });
  document.getElementById('btn-back-start').onclick = () => {
    state.screen = 'start';
    render();
  };
  document.getElementById('btn-launch').onclick = () => {
    state.screen = 'game';
    render();
  };
}

function gameScreen() {
  const mission = MISSIONS.find((m) => m.id === state.missionId);
  const swatches = ['white', 'yellow', 'blue']
    .map((c) => {
      const allowed = mission.allowedColors.includes(c);
      return `<button type="button" class="swatch ${c === mission.allowedColors[0] ? 'active' : ''}" data-color="${c}" title="${c}${allowed ? '' : ' (not used)'}" ${allowed ? '' : 'style="opacity:0.35"' } aria-label="${c} paint"></button>`;
    })
    .join('');

  return `
    <section class="screen game-screen active">
      <header class="hud">
        <div class="hud-group">
          <span class="hud-label">Score</span>
          <span class="score-pill"><span class="hud-value" id="hud-score">0%</span></span>
        </div>
        <div class="hud-group">
          <span class="hud-label">Paint</span>
          <div class="color-swatches" id="swatches">${swatches}</div>
        </div>
        <div class="brief">
          <strong>Mission ${mission.id}:</strong> ${mission.brief}
        </div>
        <div class="hud-group">
          <span class="badge">${state.mode === 'practice' ? 'Practice' : 'Test'}</span>
          <button class="btn btn-secondary" id="btn-abort" type="button">Exit</button>
          <button class="btn btn-primary" id="btn-finish" type="button">Submit</button>
        </div>
      </header>
      <div class="canvas-wrap">
        <canvas id="game-canvas" width="1000" height="700" aria-label="Parking lot painting canvas"></canvas>
      </div>
      <footer class="tips-bar">
        <strong>Tips:</strong> ${mission.tips[0]}
        &nbsp;·&nbsp; Paint: hold mouse &nbsp;·&nbsp;
        Colors: <kbd>1</kbd> White <kbd>2</kbd> Yellow <kbd>3</kbd> Blue
        &nbsp;·&nbsp; Optional move: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
        &nbsp;·&nbsp; <kbd>Enter</kbd> submit
      </footer>
    </section>
  `;
}

function bindGame() {
  const mission = MISSIONS.find((m) => m.id === state.missionId);
  const canvas = document.getElementById('game-canvas');
  const scoreEl = document.getElementById('hud-score');

  const game = new StripingGame(canvas, {
    mission,
    mode: state.mode,
    onScore(result) {
      scoreEl.textContent = `${result.score}%`;
      scoreEl.style.color =
        result.score >= PASS_THRESHOLD ? 'var(--success)' : 'var(--text)';
    },
    onComplete(result) {
      state.lastResults = {
        ...result,
        missionId: mission.id,
        missionTitle: mission.title,
        mode: state.mode,
      };
      state.screen = 'results';
      render();
    },
  });

  state.game = game;
  game.start();

  document.querySelectorAll('.swatch').forEach((el) => {
    el.onclick = () => {
      const c = el.dataset.color;
      if (!mission.allowedColors.includes(c)) return;
      game.setColor(c);
      document.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
      el.classList.add('active');
    };
  });

  // Keep swatch UI in sync when keys change color
  window.addEventListener(
    'keydown',
    function syncSwatch(e) {
      if (!state.game) {
        window.removeEventListener('keydown', syncSwatch);
        return;
      }
      const map = { '1': 'white', '2': 'yellow', '3': 'blue' };
      const c = map[e.key];
      if (!c || !mission.allowedColors.includes(c)) return;
      document.querySelectorAll('.swatch').forEach((s) => {
        s.classList.toggle('active', s.dataset.color === c);
      });
    }
  );

  document.getElementById('btn-finish').onclick = () => game.finish();
  document.getElementById('btn-abort').onclick = () => {
    state.screen = 'select';
    render();
  };
}

function resultsScreen() {
  const r = state.lastResults || {
    score: 0,
    coverage: 0,
    overspray: 0,
    wrongColor: 0,
    pass: false,
    missionTitle: 'Mission',
    mode: 'practice',
  };
  const passFail = r.pass ? 'PASS' : 'NEEDS IMPROVEMENT';
  const cls = r.pass ? 'pass' : 'fail';

  return `
    <section class="screen panel-screen active">
      <div class="card">
        <div class="badge-row">
          <span class="badge">${r.missionTitle}</span>
          <span class="badge">${r.mode === 'practice' ? 'Practice' : 'Test'}</span>
        </div>
        <h1>Results</h1>
        <div class="results-score ${cls}">${r.score}%</div>
        <p class="results-label">${passFail} · Threshold ${PASS_THRESHOLD}%</p>

        <div class="breakdown">
          <div class="breakdown-row">
            <span>Guide coverage</span>
            <span>${r.coverage}%</span>
          </div>
          <div class="breakdown-row">
            <span>Overspray</span>
            <span>${r.overspray}%</span>
          </div>
          <div class="breakdown-row">
            <span>Wrong color on guides</span>
            <span>${r.wrongColor}%</span>
          </div>
          <div class="breakdown-row">
            <span>Overall score</span>
            <span>${r.score}%</span>
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-secondary" id="btn-retry">Retry Mission</button>
          <button class="btn btn-secondary" id="btn-missions">Mission Select</button>
          <button class="btn btn-primary" id="btn-home">Home</button>
        </div>
      </div>
    </section>
  `;
}

function bindResults() {
  document.getElementById('btn-retry').onclick = () => {
    state.screen = 'game';
    render();
  };
  document.getElementById('btn-missions').onclick = () => {
    state.screen = 'select';
    render();
  };
  document.getElementById('btn-home').onclick = () => {
    state.screen = 'start';
    render();
  };
}

render();
