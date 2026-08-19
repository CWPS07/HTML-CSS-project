
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

//  mouse tracking
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let hasMouse = false;
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  hasMouse = true;
});
window.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  if (t) { mouse.x = t.clientX; mouse.y = t.clientY; hasMouse = true; }
}, { passive: true });

// spider body
const body = {
  x: mouse.x,
  y: mouse.y,
  angle: 0,       // facing direction
  bob: 0,  
};

const BODY_RADIUS = 16;
const LEG_COUNT = 8;
const COXA_LEN = 30; 
const TIBIA_LEN = 36; 
const REST_DIST = 55; 
const STEP_THRESHOLD = 46;  
const STEP_DURATION = 140; 

const LEG_ANGLES = [
  -2.55, -1.9, -1.15, -0.45,
   0.45,  1.15, 1.9,  2.55
];

class Leg {
  constructor(offsetAngle, side) {
    this.offsetAngle = offsetAngle;
    this.side = side;
    const a = body.angle + offsetAngle;
    this.foot = {
      x: body.x + Math.cos(a) * REST_DIST,
      y: body.y + Math.sin(a) * REST_DIST
    };
    this.stepFrom = { x: this.foot.x, y: this.foot.y };
    this.stepTo = { x: this.foot.x, y: this.foot.y };
    this.stepping = false;
    this.stepStart = 0;
  }

  idealPos() {
    const a = body.angle + this.offsetAngle;
    return {
      x: body.x + Math.cos(a) * REST_DIST,
      y: body.y + Math.sin(a) * REST_DIST
    };
  }

  update(now, anyOtherStepping) {
    const ideal = this.idealPos();
    const dx = ideal.x - this.foot.x;
    const dy = ideal.y - this.foot.y;
    const dist = Math.hypot(dx, dy);

    if (!this.stepping && dist > STEP_THRESHOLD && !anyOtherStepping) {
      this.stepping = true;
      this.stepStart = now;
      this.stepFrom = { x: this.foot.x, y: this.foot.y };
      this.stepTo = {
        x: ideal.x + Math.cos(body.angle + this.offsetAngle) * 12,
        y: ideal.y + Math.sin(body.angle + this.offsetAngle) * 12
      };
      return true;
    }

    if (this.stepping) {
      let t = (now - this.stepStart) / STEP_DURATION;
      if (t >= 1) {
        t = 1;
        this.stepping = false;
      }
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      this.foot.x = this.stepFrom.x + (this.stepTo.x - this.stepFrom.x) * e;
      this.foot.y = this.stepFrom.y + (this.stepTo.y - this.stepFrom.y) * e;
      this.liftT = t;
      return this.stepping;
    }

    this.liftT = 0;
    return false;
  }

  solveIK() {
    const shoulderAngle = body.angle + this.offsetAngle;
    const sx = body.x + Math.cos(shoulderAngle) * BODY_RADIUS * 0.8;
    const sy = body.y + Math.sin(shoulderAngle) * BODY_RADIUS * 0.8;

    let dx = this.foot.x - sx;
    let dy = this.foot.y - sy;
    let dist = Math.hypot(dx, dy);
    const maxLen = COXA_LEN + TIBIA_LEN - 0.5;
    const minLen = Math.abs(COXA_LEN - TIBIA_LEN) + 0.5;
    dist = Math.max(minLen, Math.min(maxLen, dist));

    const a1 = Math.atan2(dy, dx);
    const cosAngle = (COXA_LEN * COXA_LEN + dist * dist - TIBIA_LEN * TIBIA_LEN) / (2 * COXA_LEN * dist);
    const a2 = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    const bendDir = this.side;
    const kneeAngle = a1 + a2 * bendDir;

    const kx = sx + Math.cos(kneeAngle) * COXA_LEN;
    const ky = sy + Math.sin(kneeAngle) * COXA_LEN;
    const lift = this.stepping ? Math.sin(this.liftT * Math.PI) * 14 : 0;

    return {
      shoulder: { x: sx, y: sy },
      knee: { x: kx, y: ky - lift },
      foot: { x: this.foot.x, y: this.foot.y }
    };
  }
}

const legs = LEG_ANGLES.map((a, i) => new Leg(a, i < 4 ? -1 : 1));

let lastTime = performance.now();

function draw() {
  const now = performance.now();
  lastTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // mooth body follow
  const targetX = hasMouse ? mouse.x : body.x;
  const targetY = hasMouse ? mouse.y : body.y;
  const dx = targetX - body.x;
  const dy = targetY - body.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0.5) {
    body.x += dx * 0.18;
    body.y += dy * 0.18;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - body.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    body.angle += diff * 0.15;
  }

  body.bob = Math.sin(now / 260) * (dist > 1 ? 1.5 : 3);

  const groupA = [0, 3, 4, 7];
  const groupB = [1, 2, 5, 6];

  let groupAStepping = groupA.some(i => legs[i].stepping);
  let groupBStepping = groupB.some(i => legs[i].stepping);

  for (let i = 0; i < legs.length; i++) {
    const inA = groupA.includes(i);
    const blocked = inA ? groupBStepping : groupAStepping;
    legs[i].update(now, blocked);
  }

  // legs
  ctx.lineCap = 'round';
  for (const leg of legs) {
    const { shoulder, knee, foot } = leg.solveIK();

    ctx.strokeStyle = 'rgba(20,20,25,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(knee.x, knee.y);
    ctx.lineTo(foot.x, foot.y);
    ctx.stroke();

    // foot tip
    ctx.fillStyle = 'rgba(150,40,200,0.5)';
    ctx.beginPath();
    ctx.arc(foot.x, foot.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // draw body
  const by = body.y + body.bob;

  // abdomen
  const abdomenX = body.x - Math.cos(body.angle) * BODY_RADIUS * 1.4;
  const abdomenY = by - Math.sin(body.angle) * BODY_RADIUS * 1.4;
  const grad1 = ctx.createRadialGradient(abdomenX, abdomenY, 2, abdomenX, abdomenY, BODY_RADIUS * 1.3);
  grad1.addColorStop(0, '#3a1550');
  grad1.addColorStop(1, '#120510');
  ctx.fillStyle = grad1;
  ctx.beginPath();
  ctx.ellipse(abdomenX, abdomenY, BODY_RADIUS * 1.3, BODY_RADIUS * 1.05, body.angle, 0, Math.PI * 2);
  ctx.fill();

  // head
  const grad2 = ctx.createRadialGradient(body.x, by, 2, body.x, by, BODY_RADIUS);
  grad2.addColorStop(0, '#4a1f66');
  grad2.addColorStop(1, '#160818');
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.ellipse(body.x, by, BODY_RADIUS * 0.9, BODY_RADIUS * 0.75, body.angle, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  for (const s of [-1, 1]) {
    const ex = body.x + Math.cos(body.angle) * BODY_RADIUS * 0.8 + Math.cos(body.angle + Math.PI/2) * s * 5;
    const ey = by + Math.sin(body.angle) * BODY_RADIUS * 0.8 + Math.sin(body.angle + Math.PI/2) * s * 5;
    ctx.fillStyle = '#e0c3ff';
    ctx.beginPath();
    ctx.arc(ex, ey, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
