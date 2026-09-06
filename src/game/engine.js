import * as THREE from 'three';
import { getMission, PASS_THRESHOLD } from './missions.js';
import { createWorld, createGuideOverlays, LOT } from './world.js';
import { createVehicle, updateChaseCamera } from './vehicle.js';
import { createPaintSystem, scoreMission } from './paint.js';

/**
 * Three.js line-striping training session.
 */
export class StripingGame {
  /**
   * @param {HTMLElement} container
   * @param {{ missionId: number, mode: 'practice'|'test', onHud?: Function, onComplete?: Function }} opts
   */
  constructor(container, opts) {
    this.container = container;
    this.mission = getMission(opts.missionId);
    this.mode = opts.mode || 'practice';
    this.onHud = opts.onHud || (() => {});
    this.onComplete = opts.onComplete || (() => {});
    this.destroyed = false;
    this.clock = new THREE.Clock();
    this.keys = new Set();
    this.pointerDown = false;
    this.guideOpacity = this.mode === 'practice' ? 1 : 1;
    this.elapsed = 0;
    this._raf = 0;

    this._initThree();
    this._initScene();
    this._bindInput();
    this._resize();
    this._loop();
    this._pushHud('Ready — drive to a guide and spray.');
  }

  _initThree() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'game-canvas';
    this.renderer.domElement.tabIndex = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87a0b8);
    this.scene.fog = new THREE.FogExp2(0x8fa6b8, 0.012);

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 220);
    this.camera.position.set(0, 8, 16);

    // Lighting — cinematic dusk-day
    const hemi = new THREE.HemisphereLight(0xbcd4f0, 0x3a3028, 0.55);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe2c2, 1.55);
    sun.position.set(-35, 48, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 140;
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    sun.shadow.bias = -0.00025;
    this.scene.add(sun);
    this.sun = sun;

    const fill = new THREE.DirectionalLight(0xa5c4e8, 0.35);
    fill.position.set(40, 20, -30);
    this.scene.add(fill);

    // Soft sky dome tint
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(180, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color(0x5b7ea6) },
          mid: { value: new THREE.Color(0xc9b8a0) },
          bot: { value: new THREE.Color(0x6b7280) },
        },
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 top;
          uniform vec3 mid;
          uniform vec3 bot;
          varying vec3 vPos;
          void main() {
            float h = normalize(vPos).y;
            vec3 col = mix(bot, mid, smoothstep(-0.2, 0.15, h));
            col = mix(col, top, smoothstep(0.15, 0.75, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    );
    this.scene.add(sky);
  }

  _initScene() {
    this.world = createWorld(this.scene);
    this.vehicle = createVehicle();
    this.scene.add(this.vehicle.root);
    const spawn = this.mission.spawn;
    this.vehicle.setPose(spawn.x, spawn.z, spawn.rot);
    this.vehicle.setColor(this.mission.allowedColors[0] || 'white');

    this.guides = createGuideOverlays(this.mission, this.mode);
    this.scene.add(this.guides);

    this.paint = createPaintSystem(this.world, this.scene);

    // Immediate camera snap
    updateChaseCamera(this.camera, this.vehicle, 10);
  }

  _bindInput() {
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Digit1') this._setColor('white');
      if (e.code === 'Digit2') this._setColor('yellow');
      if (e.code === 'Digit3') this._setColor('blue');
      if (e.code === 'Enter') this.submit();
      if (e.code === 'KeyR' && e.shiftKey) {
        this.world.clearPaint();
        this._pushHud('Paint cleared.');
      }
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => this.keys.clear();
    this._onPointerDown = (e) => {
      if (e.button === 0) {
        this.pointerDown = true;
        this.renderer.domElement.focus();
      }
    };
    this._onPointerUp = () => {
      this.pointerDown = false;
    };
    this._onResize = () => this._resize();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('resize', this._onResize);
    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
  }

  _setColor(name) {
    if (!this.mission.allowedColors.includes(name)) {
      this._pushHud(`This mission needs ${this.mission.allowedColors.join('/')} — ${name} disabled.`);
      return;
    }
    this.vehicle.setColor(name);
    this._pushHud(`Paint: ${name.toUpperCase()}`);
  }

  _input() {
    let forward = 0;
    let steer = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer += 1;
    const spray = this.keys.has('Space') || this.pointerDown;
    return { forward, steer, spray };
  }

  _resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _fadeGuides() {
    if (this.mode !== 'test') return;
    // Fade guides over time in test mode
    const t = Math.min(1, this.elapsed / 90);
    const opacity = THREE.MathUtils.lerp(0.35, 0.06, t);
    this.guides.traverse((obj) => {
      if (obj.material && obj.material.transparent) {
        obj.material.opacity = opacity;
      }
    });
  }

  _pushHud(tip) {
    this.onHud({
      mission: this.mission,
      mode: this.mode,
      color: this.vehicle.state.color,
      speed: Math.abs(this.vehicle.state.speed),
      spraying: this.vehicle.state.spraying,
      tip: tip || this.mission.tips[0],
      elapsed: this.elapsed,
    });
  }

  _loop = () => {
    if (this.destroyed) return;
    this._raf = requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;

    const input = this._input();
    this.vehicle.update(dt, input, {
      halfW: LOT.width / 2,
      halfD: LOT.depth / 2,
    });
    this.paint.update(this.vehicle, dt);
    updateChaseCamera(this.camera, this.vehicle, dt);
    this._fadeGuides();

    // Sun gentle drift
    this.sun.position.x = -35 + Math.sin(this.elapsed * 0.05) * 4;

    this.renderer.render(this.scene, this.camera);

    if (Math.floor(this.elapsed * 4) !== Math.floor((this.elapsed - dt) * 4)) {
      this._pushHud();
    }
  };

  submit() {
    const results = scoreMission(this.world, this.mission);
    results.passed = results.score >= PASS_THRESHOLD;
    results.missionId = this.mission.id;
    results.missionTitle = this.mission.title;
    results.mode = this.mode;
    results.threshold = PASS_THRESHOLD;
    this.onComplete(results);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointerup', this._onPointerUp);
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
      this.paint?.dispose();
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
