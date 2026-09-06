import { MISSIONS, PASS_THRESHOLD, COLORS } from './game/missions.js';
import { StripingGame } from './game/engine.js';

const app = document.getElementById('app');

const state = {
  screen: 'start',
  missionId: 1,
  mode: 'practice',
  game: null,
  lastResults: null,
  hudTip: '',
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
      <div class="card hero-card">
        <div class="badge-row">
          <span class="badge">3D Training Sim</span>
          <span class="badge">Industrial Grade</span>
        </div>
        <h1>LINE STRIPING TRAINER</h1>
        <p class="subtitle">
          Climb into a striping truck and restripe a Supercenter-style lot — BFR, ADA, SECP crosswalk, fire lane.
          Chase-cam driving, persistent spray on asphalt, mission scoring —
          built to get new hires field-ready.
        </p>
        <ul class="feature-list">
          <li>Driveable striper · WASD + boom spray</li>
          <li>Big-box lot · stalls, ADA, arrows & crosswalk</li>
          <li>Practice ghosts or Test mode fade-out</li>
        </ul>
        <div class="btn-row">
          <button class="btn btn-primary" id="btn-start">Enter Simulator</button>
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
        <p class="subtitle">Pick a scenario and mode. Practice shows clear ghost guides; Test fades them as you work.</p>

        <div class="mode-toggle" role="group" aria-label="Training mode">
          <button type="button" class="btn btn-secondary ${state.mode === 'practice' ? 'active' : ''}" data-mode="practice">Practice</button>
          <button type="button" class="btn btn-secondary ${state.mode === 'test' ? 'active' : ''}" data-mode="test">Test</button>
        </div>

        <div class="mission-list">${cards}</div>

        <div class="btn-row">
          <button class="btn btn-secondary" id="btn-back-start">Back</button>
          <button class="btn btn-primary" id="btn-launch">Launch Mission</button>
        </div>
      </div>
    </section>
  `;
}

function bindSelect() {
  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.onclick = () => {
      state.mode = btn.dataset.mode;
      render();
    };
  });
  document.querySelectorAll('.mission-card').forEach((card) => {
    card.onclick = () => {
      state.missionId = Number(card.dataset.id);
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
  const m = MISSIONS.find((x) => x.id === state.missionId) || MISSIONS[0];
  return `
    <section class="screen game-screen active">
      <div id="viewport" class="viewport"></div>
      <div class="hud">
        <div class="hud-top">
          <div class="hud-block">
            <span class="hud-label">Mission</span>
            <span class="hud-value" id="hud-mission">${m.title}</span>
          </div>
          <div class="hud-block">
            <span class="hud-label">Mode</span>
            <span class="hud-value" id="hud-mode">${state.mode}</span>
          </div>
          <div class="hud-block">
            <span class="hud-label">Paint</span>
            <span class="hud-value paint-swatch" id="hud-color">
              <i id="hud-swatch" style="background:${COLORS[m.allowedColors[0]]}"></i>
              <span id="hud-color-name">${m.allowedColors[0]}</span>
            </span>
          </div>
          <div class="hud-block">
            <span class="hud-label">Speed</span>
            <span class="hud-value" id="hud-speed">0 mph</span>
          </div>
        </div>
        <div class="hud-bottom">
          <div class="hud-tip" id="hud-tip">${m.brief}</div>
          <div class="hud-actions">
            <button class="btn btn-secondary btn-sm" id="btn-abort">Abort</button>
            <button class="btn btn-primary btn-sm" id="btn-submit">Submit Score</button>
          </div>
        </div>
        <div class="hud-help">
          <span>WASD / Arrows drive</span>
          <span>Space / LMB spray</span>
          <span>1 White · 2 Yellow · 3 Blue</span>
          <span>Enter submit</span>
        </div>
      </div>
    </section>
  `;
}

function bindGame() {
  const viewport = document.getElementById('viewport');
  state.game = new StripingGame(viewport, {
    missionId: state.missionId,
    mode: state.mode,
    onHud: (data) => {
      const sw = document.getElementById('hud-swatch');
      const cn = document.getElementById('hud-color-name');
      const tip = document.getElementById('hud-tip');
      const spd = document.getElementById('hud-speed');
      if (sw) sw.style.background = COLORS[data.color] || '#fff';
      if (cn) cn.textContent = data.color;
      if (tip && data.tip) tip.textContent = data.tip;
      if (spd) spd.textContent = `${(data.speed * 2.2).toFixed(0)} mph`;
    },
    onComplete: (results) => {
      state.lastResults = results;
      state.screen = 'results';
      render();
    },
  });

  document.getElementById('btn-abort').onclick = () => {
    state.screen = 'select';
    render();
  };
  document.getElementById('btn-submit').onclick = () => {
    state.game?.submit();
  };

  // Focus canvas for keys
  requestAnimationFrame(() => {
    state.game?.renderer?.domElement?.focus();
  });
}

function resultsScreen() {
  const r = state.lastResults || {
    score: 0,
    coverage: 0,
    overspray: 0,
    wrongColor: 0,
    passed: false,
    missionTitle: '—',
    mode: state.mode,
    threshold: PASS_THRESHOLD,
  };
  const passClass = r.passed ? 'pass' : 'fail';
  return `
    <section class="screen panel-screen active">
      <div class="card results-card">
        <div class="badge-row">
          <span class="badge">${r.missionTitle}</span>
          <span class="badge">${r.mode}</span>
        </div>
        <h1 class="${passClass}">${r.passed ? 'PASS' : 'NEEDS WORK'}</h1>
        <p class="subtitle">Score ${r.score}% · pass at ${r.threshold}%</p>

        <div class="score-grid">
          <div class="score-cell">
            <span class="hud-label">Coverage</span>
            <span class="hud-value">${r.coverage}%</span>
          </div>
          <div class="score-cell">
            <span class="hud-label">Overspray penalty</span>
            <span class="hud-value">−${r.overspray}</span>
          </div>
          <div class="score-cell">
            <span class="hud-label">Wrong color</span>
            <span class="hud-value">−${r.wrongColor}</span>
          </div>
          <div class="score-cell highlight">
            <span class="hud-label">Final</span>
            <span class="hud-value">${r.score}%</span>
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-secondary" id="btn-retry">Retry</button>
          <button class="btn btn-secondary" id="btn-missions">Missions</button>
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
