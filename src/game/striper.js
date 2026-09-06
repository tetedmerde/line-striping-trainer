/**
 * Top-down LineLazer-style striper (hopper + gun arm + tip).
 * World units = plan pixels.
 */
export class Striper {
  constructor() {
    this.x = 700;
    this.y = 1100;
    this.rot = -0.95;
    this.speed = 0;
    this.maxSpeed = 110;
    this.accel = 160;
    this.brake = 240;
    this.turnRate = 2.6;
    this.locked = false;
    this.lockGuide = null;
    this.lockT = 0;
    this.armLength = 28;
  }

  reset(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.rot = spawn.rot;
    this.speed = 0;
    this.locked = false;
    this.lockGuide = null;
  }

  tip() {
    return {
      x: this.x + Math.cos(this.rot) * this.armLength,
      y: this.y + Math.sin(this.rot) * this.armLength,
    };
  }

  /**
   * @param {number} dt
   * @param {{forward:number, turn:number, precision:boolean}} input
   */
  update(dt, input) {
    if (this.locked && this.lockGuide) {
      this._updateLocked(dt, input);
      return;
    }

    const max = input.precision ? this.maxSpeed * 0.35 : this.maxSpeed;
    if (input.forward > 0) {
      this.speed = Math.min(max, this.speed + this.accel * dt);
    } else if (input.forward < 0) {
      this.speed = Math.max(-max * 0.55, this.speed - this.accel * dt);
    } else if (this.speed > 0) {
      this.speed = Math.max(0, this.speed - this.brake * 0.45 * dt);
    } else if (this.speed < 0) {
      this.speed = Math.min(0, this.speed + this.brake * 0.45 * dt);
    }

    // Steer even when nearly stopped — lining up the laser must be easy
    const steerScale = 0.6 + Math.min(1, Math.abs(this.speed) / 40) * 0.4;
    this.rot += input.turn * this.turnRate * steerScale * dt;

    this.x += Math.cos(this.rot) * this.speed * dt;
    this.y += Math.sin(this.rot) * this.speed * dt;
  }

  _updateLocked(dt, input) {
    const guide = this.lockGuide;
    const dx = guide.b.x - guide.a.x;
    const dy = guide.b.y - guide.a.y;
    const len = Math.hypot(dx, dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;

    // Snap heading to nearest path direction
    let ang = Math.atan2(dirY, dirX);
    if (Math.abs(normalizeAngle(ang - this.rot)) > Math.PI / 2) ang += Math.PI;
    this.rot = ang;

    const max = input.precision ? this.maxSpeed * 0.4 : this.maxSpeed * 0.9;
    if (input.forward > 0) this.speed = Math.min(max, this.speed + this.accel * dt);
    else if (input.forward < 0) this.speed = Math.max(-max * 0.55, this.speed - this.accel * dt);
    else if (this.speed > 0) this.speed = Math.max(0, this.speed - this.brake * 0.5 * dt);
    else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.brake * 0.5 * dt);

    // Advance tip along the locked guide
    const tip = this.tip();
    let t = ((tip.x - guide.a.x) * dx + (tip.y - guide.a.y) * dy) / (len * len);
    t += (this.speed * dt) / len;
    t = Math.max(-0.02, Math.min(1.02, t));
    this.lockT = t;

    const tipX = guide.a.x + dx * t;
    const tipY = guide.a.y + dy * t;
    this.x = tipX - Math.cos(this.rot) * this.armLength;
    this.y = tipY - Math.sin(this.rot) * this.armLength;

    // Hard steer breaks lock (real stripers unlock to reposition)
    if (Math.abs(input.turn) > 0.9) this.unlock();
  }

  lock(guide) {
    this.locked = true;
    this.lockGuide = guide;
    const tip = this.tip();
    const dx = guide.b.x - guide.a.x;
    const dy = guide.b.y - guide.a.y;
    const len2 = dx * dx + dy * dy || 1;
    this.lockT = ((tip.x - guide.a.x) * dx + (tip.y - guide.a.y) * dy) / len2;

    let ang = Math.atan2(dy, dx);
    if (Math.abs(normalizeAngle(ang - this.rot)) > Math.PI / 2) ang += Math.PI;
    this.rot = ang;

    // Snap tip onto the line immediately
    const t = Math.max(0, Math.min(1, this.lockT));
    const tipX = guide.a.x + dx * t;
    const tipY = guide.a.y + dy * t;
    this.x = tipX - Math.cos(this.rot) * this.armLength;
    this.y = tipY - Math.sin(this.rot) * this.armLength;
    this.lockT = t;
  }

  unlock() {
    this.locked = false;
    this.lockGuide = null;
  }

  draw(ctx) {
    const tip = this.tip();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2a3340';
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 1.5;
    roundRect(ctx, -16, -9, 28, 18, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff4d6d';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOOKERS', -2, 2);

    ctx.strokeStyle = '#c5d0de';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(this.armLength - 2, 0);
    ctx.stroke();

    ctx.fillStyle = '#e8eef7';
    ctx.beginPath();
    ctx.arc(this.armLength, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#11161d';
    ctx.fillRect(-12, -11, 7, 3);
    ctx.fillRect(-12, 8, 7, 3);
    ctx.fillRect(2, -11, 7, 3);
    ctx.fillRect(2, 8, 7, 3);

    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(61, 255, 138, 0.35)';
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
