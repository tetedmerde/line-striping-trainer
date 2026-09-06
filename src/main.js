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
          <span class="badge badge-crew">HOOKERS Crew</span>
          <span class="badge">#2855 Lot</span>
          <span class="badge">LineLazer Sim</span>
        </div>
        <h1>HOOKERS</h1>
        <p class="tagline">Line Striping Trainer</p>
        <p class="subtitle">
          Climb onto the ride-on airless striper and restripe Supercenter <strong>#2855</strong> —
          real site-plan layout, LazerGuide-style target lock, and a smooth 4" tip coat.
          Your Hookers crew mates are already on the asphalt. Don’t embarrass them.
        </p>
        <ul class="feature-list">
          <li>LineLazer-style striper · hopper · gun arm · laser at the tip</li>
          <li>Place target → aim laser → <strong>L to LOCK</strong> → stripe clean multi-bay lines</li>
          <li>Continuous airless paint (not speckles) · freehand still there if you’re a masochist</li>
        </ul>
        <div class="btn-row">
          <button class="btn btn-primary" id="btn-start">Roll With Hookers</button>
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
        <div class="badge-row">
          <span class="badge badge-crew">HOOKERS</span>
        </div>
        <h1>Pick Your Chaos</h1>
        <p class="subtitle">Practice keeps the ghosts bright. Test fades them while the crew watches. Default workflow: laser lock — freehand is advanced/hard mode.</p>

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
            <span class="hud-label">HOOKERS · Mission</span>
            <span class="hud-value" id="hud-mission">${m.title}</span>
          </div>
          <div class="hud-block">
            <span class="hud-label">Mode</span>
            <span class="hud-value" id="hud-mode">${state.mode}</span>
          </div>
          <div class="hud-block hud-color-block">
            <span class="hud-label">Paint (click / 1·2·3)</span>
            <div class="color-swatches" id="color-swatches">
              <button type="button" class="swatch" data-color="white" title="White (1)" style="--sw:${COLORS.white}"><span>1</span></button>
              <button type="button" class="swatch" data-color="yellow" title="Yellow (2)" style="--sw:${COLORS.yellow}"><span>2</span></button>
              <button type="button" class="swatch" data-color="blue" title="Blue (3)" style="--sw:${COLORS.blue}"><span>3</span></button>
            </div>
            <span class="hud-value paint-swatch" id="hud-color">
              <i id="hud-swatch" style="background:${COLORS[m.allowedColors[0]]}"></i>
              <span id="hud-color-name">${m.allowedColors[0]}</span>
            </span>
          </div>
          <div class="hud-block">
            <span class="hud-label">Speed</span>
            <span class="hud-value" id="hud-speed">0 mph</span>
          </div>
          <div class="hud-block">
            <span class="hud-label">Laser / Lock</span>
            <span class="hud-value" id="hud-laser"><span class="laser-pill aiming" id="hud-laser-pill">AIMING</span></span>
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
          <span>WASD drive</span>
          <span>G laser</span>
          <span>T target</span>
          <span>L / F lock</span>
          <span>Space / LMB spray</span>
          <span>Shift crawl</span>
          <span>1·2·3 paint</span>
          <span>V top-down</span>
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
      const pill = document.getElementById('hud-laser-pill');
      if (sw) sw.style.background = COLORS[data.color] || '#fff';
      if (cn) cn.textContent = data.color + (data.precision ? ' · CRAWL' : '');
      if (tip && data.tip) tip.textContent = data.tip;
      if (spd) spd.textContent = `${(data.speed * 2.2).toFixed(0)} mph`;
      if (pill) {
        const label = data.laserLabel || 'AIMING';
        pill.textContent =
          label +
          (data.targetCount
            ? ` · T${data.targetIndex}/${data.targetCount}`
            : '');
        pill.className =
          'laser-pill ' +
          (data.locked
            ? 'locked'
            : data.onTarget
              ? 'on-target'
              : data.laserOn
                ? 'aiming'
                : 'off');
      }
      document.querySelectorAll('.swatch').forEach((el) => {
        el.classList.toggle('active', el.dataset.color === data.color);
      });
    },
    onComplete: (results) => {
      state.lastResults = results;
      state.screen = 'results';
      render();
    },
  });

  document.querySelectorAll('.swatch').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.game?.setColorFromHud(btn.dataset.color);
    };
  });

  document.getElementById('btn-abort').onclick = () => {
    state.screen = 'select';
    render();
  };
  document.getElementById('btn-submit').onclick = () => {
    state.game?.submit();
  };

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
  const headline = r.passed ? 'HOOKERS APPROVE' : 'NEEDS ANOTHER PASS';
  return `
    <section class="screen panel-screen active">
      <div class="card results-card">
        <div class="badge-row">
          <span class="badge badge-crew">HOOKERS</span>
          <span class="badge">${r.missionTitle}</span>
          <span class="badge">${r.mode}</span>
        </div>
        <h1 class="${passClass}">${headline}</h1>
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
