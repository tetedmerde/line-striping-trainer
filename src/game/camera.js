import * as THREE from 'three';
import { planToWorld } from './coords.js';

/** Chase / shoulder / top-down assist camera. Default chase must stay controllable. */
export class GameCamera {
  /**
   * @param {THREE.PerspectiveCamera} camera
   */
  constructor(camera) {
    this.camera = camera;
    /** @type {'chase'|'shoulder'|'top'} */
    this.mode = 'chase';
    this._pos = new THREE.Vector3(0, 8, 12);
    this._look = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
  }

  cycleMode() {
    const order = ['chase', 'shoulder', 'top'];
    const i = order.indexOf(this.mode);
    this.mode = order[(i + 1) % order.length];
    return this.mode;
  }

  setTop(on) {
    this.mode = on ? 'top' : 'chase';
  }

  toggleTop() {
    this.mode = this.mode === 'top' ? 'chase' : 'top';
    return this.mode;
  }

  toggleShoulder() {
    this.mode = this.mode === 'shoulder' ? 'chase' : 'shoulder';
    return this.mode;
  }

  /**
   * @param {import('./striper.js').Striper} striper
   * @param {number} dt
   */
  update(striper, dt) {
    const w = planToWorld(striper.x, striper.y);
    const yaw = striper.root.rotation.y;
    const forward = this._tmp.set(Math.sin(yaw), 0, Math.cos(yaw));

    let idealPos;
    let idealLook;

    if (this.mode === 'top') {
      idealPos = new THREE.Vector3(w.x, 28, w.z + 0.01);
      idealLook = new THREE.Vector3(w.x, 0, w.z);
    } else if (this.mode === 'shoulder') {
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      idealPos = new THREE.Vector3(
        w.x - forward.x * 2.2 + right.x * 1.4,
        2.4,
        w.z - forward.z * 2.2 + right.z * 1.4
      );
      const tip = striper.tipWorld();
      idealLook = new THREE.Vector3(tip.x, 0.4, tip.z).addScaledVector(forward, 6);
    } else {
      // Stable chase
      idealPos = new THREE.Vector3(
        w.x - forward.x * 7.5,
        4.8,
        w.z - forward.z * 7.5
      );
      idealLook = new THREE.Vector3(w.x + forward.x * 4, 0.8, w.z + forward.z * 4);
    }

    const follow = this.mode === 'top' ? 6 * dt : 4.5 * dt;
    this._pos.lerp(idealPos, Math.min(1, follow));
    this._look.lerp(idealLook, Math.min(1, follow * 1.2));
    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._look);
  }
}
