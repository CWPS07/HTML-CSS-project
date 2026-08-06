
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

let numSparks = 110;
let grav = 0.03;
let fadeAlpha = 0.13;
let autoMode = true;
let autoTick = 0;
let autoInterval = 65;

const PALETTES = [
  ['#ff6b6b','#ffa94d','#ffd43b'],
  ['#74c0fc','#4dabf7','#a9e0ff'],
  ['#63e6be','#38d9a9','#a3f7d4'],
  ['#da77f2','#cc5de8','#f3d9fa'],
  ['#ff8787','#f783ac','#ffd6e0'],
  ['#4fc3f7','#81d4fa','#e1f5fe'],
  ['#ffb347','#ffcc02','#fff176'],
  ['#ff6fb1','#ff4d94','#ffa8cc'],
  ['#69db7c','#40c057','#b2f2bb'],
  ['#ff922b','#fd7e14','#ffe8cc'],
];

function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const stars = Array.from({length: 120},() => ({
  x: Math.random(), y: Math.random() * 0.75,
  r: Math.random() < 0.15 ? 1.2 : 0.55,
  flicker: Math.random() * Math.PI * 2,
  speed: rnd(0.6, 1.8)
}));

function drawStars(t) {
  ctx.save();
  for (const s of stars) {
    const a = 0.15 + 0.25 * Math.sin(s.flicker + t * s.speed * 0.001);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHorizon() {
  const grd = ctx.createLinearGradient(0, H * 0.72, 0, H);
  grd.addColorStop(0, 'rgba(15,5,40,0)');
  grd.addColorStop(1, 'rgba(20,8,50,0.55)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, H * 0.72, W, H * 0.28);
}

class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.size = size;
    this.alpha = 1;
    this.decay = rnd(0.010, 0.020) * (1 / (life || 1));
    this.trail = [];
  }
  update() {
    this.trail.push([this.x, this.y]);
    if (this.trail.length > 10) this.trail.shift();
    this.vx *= 0.975;
    this.vy = this.vy * 0.975 + grav;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }
  draw() {
    if (this.trail.length > 1) {
      ctx.save();
      for (let i = 1; i < this.trail.length; i++) {
        const t = i / this.trail.length;
        ctx.globalAlpha = this.alpha * t * 0.45;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size * t * 0.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.trail[i-1][0], this.trail[i-1][1]);
        ctx.lineTo(this.trail[i][0], this.trail[i][1]);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.size * 4;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
class Shell {
  constructor(x, ty) {
    this.x = x;
    this.y = H + 10;
    this.ty = ty;
    const dist = H - ty;
    this.vy = -(dist / 32) - rnd(0, 1);
    this.vx = rnd(-0.8, 0.8);
    this.done = false;
    this.palette = pick(PALETTES);
    this.trail = [];
  }
  update() {
    this.trail.push([this.x, this.y]);
    if (this.trail.length > 14) this.trail.shift();
    this.vy += 0.045;
    this.x += this.vx;
    this.y += this.vy;
    if (this.y <= this.ty) this.burst();
  }
  burst() {
    this.done = true;
    const n = numSparks;
    const kind = Math.random();
    const cx = this.x, cy = this.y;

    if (kind < 0.2) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const sp = rnd(3, 5.5);
        particles.push(new Particle(cx, cy, Math.cos(a)*sp, Math.sin(a)*sp, pick(this.palette), rnd(1.5,2.5)));
      }
    } else if (kind < 0.4) {
      for (let i = 0; i < n * 1.4; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rnd(0.3, 5.5);
        const p = new Particle(cx, cy, Math.cos(a)*sp, Math.sin(a)*sp, pick(this.palette), rnd(1,2.2));
        particles.push(p);
      }
    } else if (kind < 0.6) {
      const arms = Math.floor(rnd(5, 9));
      for (let a = 0; a < arms; a++) {
        const base = (a / arms) * Math.PI * 2;
        for (let i = 0; i < Math.ceil(n / arms); i++) {
          const angle = base + (Math.random() - 0.5) * 0.3;
          const sp = rnd(1.5, 5.5);
          particles.push(new Particle(cx, cy, Math.cos(angle)*sp, Math.sin(angle)*sp,
            this.palette[a % this.palette.length], rnd(1.5,2.5)));
        }
      }
    } else if (kind < 0.8) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rnd(1, 4.5);
        const p = new Particle(cx, cy, Math.cos(a)*sp, Math.sin(a)*sp - 0.5, pick(this.palette), rnd(1.2, 2), 0.55);
        particles.push(p);
      }
    } else {
      for (let ring = 0; ring < 2; ring++) {
        const nn = Math.floor(n * 0.6);
        const offset = ring * Math.PI / nn;
        const sp = ring === 0 ? rnd(2, 3.5) : rnd(4, 6);
        const col = this.palette[ring % this.palette.length];
        for (let i = 0; i < nn; i++) {
          const a = (i / nn) * Math.PI * 2 + offset;
          particles.push(new Particle(cx, cy, Math.cos(a)*sp, Math.sin(a)*sp, col, rnd(1.5,2.2)));
        }
      }
    }

    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rnd(0.2, 2);
      particles.push(new Particle(cx, cy, Math.cos(a)*sp, Math.sin(a)*sp, '#ffffff', rnd(0.8, 1.8)));
    }

    flashes.push({ x: cx, y: cy, r: 0, maxR: rnd(60, 110), color: this.palette[0], alpha: 1 });
  }
  draw() {
    if (this.done) return;
    ctx.save();
    for (let i = 1; i < this.trail.length; i++) {
      const t = i / this.trail.length;
      ctx.globalAlpha = t * 0.55;
      ctx.strokeStyle = '#ffe082';
      ctx.lineWidth = 2 * t;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[i-1][0], this.trail[i-1][1]);
      ctx.lineTo(this.trail[i][0], this.trail[i][1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff9c4';
    ctx.shadowColor = '#ffe082';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let flashes = [];
function updateFlashes() {
  flashes = flashes.filter(f => f.alpha > 0.01);
  for (const f of flashes) {
    ctx.save();
    ctx.globalAlpha = f.alpha * 0.18;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    f.r += (f.maxR - f.r) * 0.22;
    f.alpha *= 0.82;
  }
}

let shells = [];
let particles = [];

function launch(x, y) {
  const tx = x !== undefined ? x : rnd(W * 0.12, W * 0.88);
  const ty = y !== undefined ? y : rnd(H * 0.08, H * 0.45);
  shells.push(new Shell(tx, ty));
}

let hintVisible = true;
let hintTimeout;
function hideHint() {
  if (hintVisible) {
    document.getElementById('hint').style.opacity = '0';
    hintVisible = false;
  }
}

canvas.addEventListener('click', e => {
  launch(e.clientX, e.clientY);
  hideHint();
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  launch(t.clientX, t.clientY);
  hideHint();
}, { passive: false });

function bindRange(id, vid, cb) {
  const el = document.getElementById(id);
  const vl = document.getElementById(vid);
  el.addEventListener('input', () => { vl.textContent = el.value; cb(+el.value); });
}
bindRange('r-sparks', 'v-sparks', v => numSparks = v);
bindRange('r-grav',   'v-grav',   v => grav = v * 0.01);
bindRange('r-fade',   'v-fade',   v => fadeAlpha = v * 0.03);

const btnAuto = document.getElementById('btn-auto');
btnAuto.addEventListener('click', () => {
  autoMode = !autoMode;
  btnAuto.classList.toggle('active', autoMode);
  btnAuto.textContent = autoMode ? 'Auto ✦' : 'Auto ○';
});

hintTimeout = setTimeout(hideHint, 4000);

let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);

  ctx.fillStyle = `rgba(3,1,13,${fadeAlpha})`;
  ctx.fillRect(0, 0, W, H);

  drawStars(t);
  drawHorizon();

  if (autoMode) {
    autoTick++;
    if (autoTick >= autoInterval) {
      autoTick = 0;
      autoInterval = Math.floor(rnd(45, 100));
      const burst = Math.random() < 0.25 ? 2 : 1;
      for (let b = 0; b < burst; b++) setTimeout(() => launch(), b * rnd(80, 250));
    }
  }

  for (const s of shells) if (!s.done) s.update();
  for (const s of shells) s.draw();
  shells = shells.filter(s => !s.done);

  updateFlashes();

  particles = particles.filter(p => p.alpha > 0.015);
  for (const p of particles) { p.update(); p.draw(); }
}
requestAnimationFrame(loop);
