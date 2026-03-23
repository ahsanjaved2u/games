const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

// Add game-specific strength stat to HUD
GameHUD.addStat(`
    <div class="hood-btn" id="strength-btn">
        <div id="strength-top">
            <span id="strength-icon">&#9889;</span>
            <span id="strength-label">12</span>
        </div>
        <div id="strength-track">
            <div id="strength-bar"></div>
        </div>
    </div>
`);

const strengthBar = document.getElementById('strength-bar');
const strengthLabel = document.getElementById('strength-label');
const timeDisplay = document.getElementById('time-display');
const liveScoreEl = document.getElementById('live-score');

// Audio system
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Sound config per color: frequency, type, duration
const popSounds = {
    '#c45c5c': { freq: 880, type: 'sine', dur: 0.15 },       // Red - high bright ping
    '#c4a84e': { freq: 587, type: 'triangle', dur: 0.2 },    // Yellow - warm mid tone
    '#5aab5a': { freq: 392, type: 'sine', dur: 0.25 }        // Green - deep soft chime
};

function playPopSound(color) {
    const cfg = popSounds[color] || { freq: 600, type: 'sine', dur: 0.2 };
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(cfg.freq * 1.5, audioCtx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(cfg.freq * 0.5, audioCtx.currentTime + cfg.dur);

    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + cfg.dur);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + cfg.dur);
}

function playShootSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function resizeCanvas() {
    const isMobileView = window.innerWidth <= 768;
    const maxW = isMobileView ? window.innerWidth : window.innerWidth * 0.9;
    // Use the actual visible viewport height
    const maxH = window.innerHeight;
    const container = document.getElementById('game-container');

    // On mobile: fill full width, height = remaining after hood
    // On desktop: use portrait aspect ratio
    if (isMobileView) {
        const w = maxW;
        container.style.width = w + 'px';
        container.style.setProperty('--s', Math.min(w / 400, 1));
        const hoodH = document.getElementById('hood').offsetHeight || 34;
        const h = maxH - hoodH;
        canvas.width = Math.floor(w);
        canvas.height = Math.floor(h);
    } else {
        const estimatedHoodH = 48;
        let h = maxH - estimatedHoodH;
        let w = h * (12 / 16);
        if (w > maxW) {
            w = maxW;
            h = w * (16 / 12);
        }
        canvas.width = Math.floor(w);
        canvas.height = Math.floor(h);
        container.style.width = canvas.width + 'px';
        const uiScale = Math.min(canvas.width / 400, 1);
        container.style.setProperty('--s', uiScale);
        const actualHoodH = document.getElementById('hood').offsetHeight || (48 * uiScale);
        const totalH = canvas.height + actualHoodH;
        if (totalH > maxH) {
            h = maxH - actualHoodH;
            w = h * (12 / 16);
            if (w > maxW) {
                w = maxW;
                h = w * (16 / 12);
            }
            canvas.width = Math.floor(w);
            canvas.height = Math.floor(h);
            container.style.width = canvas.width + 'px';
            container.style.setProperty('--s', Math.min(canvas.width / 400, 1));
        }
    }
}
resizeCanvas();
GameBackground.init(canvas.width, canvas.height);

// ── Dynamic scale factor ──
// All game element sizes are designed for a ~400px wide canvas.
// Scale proportionally when canvas is smaller or larger.
const REF_WIDTH = 480;
let scaleFactor = canvas.width / REF_WIDTH;
function S(baseValue) { return baseValue * scaleFactor; }

let score = 0;

// ── Preload bubble images ──
const bubbleImages = {};
const bubbleImageMap = {
    '#c45c5c': 'images/red-bubble.png',
    '#c4a84e': 'images/yellow-bubble.png',
    '#5aab5a': 'images/green-bubble.png'
};
(function preloadBubbleImages() {
    for (const [color, src] of Object.entries(bubbleImageMap)) {
        const img = new Image();
        img.src = src;
        bubbleImages[color] = img;
    }
})();

// Preload firing (player) bubble image
const firingBubbleImg = new Image();
firingBubbleImg.src = 'images/firing-bubble.png';

// Preload background image
const bgImg = new Image();
bgImg.src = 'images/background.png';

// Preload clouds overlay image
const cloudsImg = new Image();
cloudsImg.src = 'images/clouds.png';
let cloudAngle = 0;

// Preload shield image
const shieldImg = new Image();
shieldImg.src = 'images/shield.png';

// Preload bullet image
const bulletImg = new Image();
bulletImg.src = 'images/bullet.png';

// Base radii (designed for REF_WIDTH 400px) — will be scaled via S()
const BUBBLE_BASE = [
    { color: '#c45c5c', baseRadius: 18, points: 3, count: 4 }, // Soft Red - small
    { color: '#c4a84e', baseRadius: 22, points: 2, count: 4 }, // Soft Yellow - medium
    { color: '#5aab5a', baseRadius: 30, points: 1, count: 4 }  // Soft Green - large
];

// Scaled bubbleTypes (rebuilt on resize)
let bubbleTypes = BUBBLE_BASE.map(b => ({ ...b, radius: S(b.baseRadius) }));

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: S(28),
    color: '#ffffff',
    angle: 0,
    arrowLength: S(40)
};

let projectile = null;
let bubbles = [];
let particles = [];
let scorePopups = [];
let gameOver = false;

// ── Shield system ──
let shield = null;           // { x, y, radius, life, pulse }
let shieldLastScore = 0;     // score when last shield appeared
const SHIELD_INTERVAL = 50;  // shield every 50 points
const SHIELD_BASE_RADIUS = 30;
let screenShake = 0;
let gamePaused = false;
let gameStartTime = 0;
let gameElapsedTime = 0;  // in seconds
let pauseStartTime = 0;
let totalPauseTime = 0;

function isMobile() {
    return window.innerWidth <= 768;
}

function playGameOverSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.7);
}



function restartGame() {
    score = 0;
    scoreEl.textContent = score;
    GameHUD.reset();
    gameOver = false;
    gamePaused = false;
    projectile = null;
    // Recalculate scale factor on restart
    scaleFactor = canvas.width / REF_WIDTH;
    bubbleTypes = BUBBLE_BASE.map(b => ({ ...b, radius: S(b.baseRadius) }));
    player.radius = S(28);
    player.arrowLength = S(40);
    BRICK_THICKNESS = S(BRICK_BASE_THICKNESS);
    BRICK_GAP = S(BRICK_BASE_GAP);
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    gameStartTime = performance.now();
    totalPauseTime = 0;
    gameElapsedTime = 0;
    timeDisplay.textContent = '0:00';
    liveScoreEl.textContent = '0';
    shield = null;
    shieldLastScore = 0;
    initWalls();
    initBubbles();
}

// Brick system - 12 bricks distributed around the full perimeter
const BRICK_BASE_THICKNESS = 12;
const BRICK_BASE_GAP = 3;
let BRICK_THICKNESS = S(BRICK_BASE_THICKNESS);
let BRICK_GAP = S(BRICK_BASE_GAP);
const BRICK_COLOR = '#6c5ce7'; // Neon Purple
const TOTAL_BRICKS_START = 12;
let totalBricks = TOTAL_BRICKS_START;

function initWalls() {
    totalBricks = TOTAL_BRICKS_START;
    updateStrengthBar();
}

function updateStrengthBar() {
    const pct = totalBricks / TOTAL_BRICKS_START;
    strengthBar.style.width = (pct * 100) + '%';
    strengthLabel.textContent = totalBricks;

    // Green → Yellow → Red gradient
    let r, g, b;
    if (pct > 0.5) {
        // green to yellow
        const t = (pct - 0.5) * 2; // 1→0
        r = Math.round(46 + (200 - 46) * (1 - t));
        g = Math.round(204 - (204 - 180) * (1 - t));
        b = Math.round(113 * t + 50 * (1 - t));
    } else {
        // yellow to red
        const t = pct * 2; // 1→0
        r = Math.round(200 + (220 - 200) * (1 - t));
        g = Math.round(180 * t + 50 * (1 - t));
        b = Math.round(50 * t + 50 * (1 - t));
    }
    const clr = `rgb(${r},${g},${b})`;
    strengthBar.style.background = `linear-gradient(90deg, ${clr}, ${lighterHSL(clr)})`;
    strengthBar.style.boxShadow = `0 0 8px ${clr}88, inset 0 1px 0 rgba(255,255,255,0.2)`;
}

function lighterHSL(rgb) {
    // Quick brighten: just parse and bump
    const m = rgb.match(/\d+/g).map(Number);
    return `rgb(${Math.min(255,m[0]+30)},${Math.min(255,m[1]+30)},${Math.min(255,m[2]+20)})`;
}

// Bricks: at start → 2 top, 2 bottom, 4 right, 4 left
// When bricks decrease, redistribute evenly around the perimeter
function getAllBricks() {
    if (totalBricks <= 0) return [];

    const W = canvas.width;
    const H = canvas.height;
    const T = BRICK_THICKNESS;
    const gap = BRICK_GAP;
    const bricks = [];

    // Fixed distribution at full count
    if (totalBricks === TOTAL_BRICKS_START) {
        const sideAlloc = { top: 2, bottom: 2, right: 4, left: 4 };

        // Helper: place N bricks evenly along a side
        function placeBricks(side, count) {
            if (side === 'top' || side === 'bottom') {
                const segW = W / count;
                for (let i = 0; i < count; i++) {
                    const x = i * segW + gap / 2;
                    const w = segW - gap;
                    const y = side === 'top' ? 0 : H - T;
                    bricks.push({ x, y, w, h: T, side });
                }
            } else {
                const segH = H / count;
                for (let i = 0; i < count; i++) {
                    const y = i * segH + gap / 2;
                    const h = segH - gap;
                    const x = side === 'left' ? 0 : W - T;
                    bricks.push({ x, y, w: T, h, side });
                }
            }
        }

        placeBricks('top', sideAlloc.top);
        placeBricks('bottom', sideAlloc.bottom);
        placeBricks('right', sideAlloc.right);
        placeBricks('left', sideAlloc.left);
        return bricks;
    }

    // Reduced count: distribute evenly around perimeter
    const perimeter = 2 * (W + H);
    const segLen = perimeter / totalBricks;

    const sideBounds = [
        { s: 0,         e: W,           side: 'top' },
        { s: W,         e: W + H,       side: 'right' },
        { s: W + H,     e: 2 * W + H,   side: 'bottom' },
        { s: 2 * W + H, e: perimeter,    side: 'left' }
    ];

    for (let i = 0; i < totalBricks; i++) {
        const segStart = i * segLen + gap / 2;
        const segEnd = (i + 1) * segLen - gap / 2;

        for (const sb of sideBounds) {
            const cStart = Math.max(segStart, sb.s);
            const cEnd = Math.min(segEnd, sb.e);
            if (cStart >= cEnd) continue;

            const local0 = cStart - sb.s;
            const local1 = cEnd - sb.s;
            let x, y, w, h;

            if (sb.side === 'top') {
                x = local0; y = 0; w = local1 - local0; h = T;
            } else if (sb.side === 'right') {
                x = W - T; y = local0; w = T; h = local1 - local0;
            } else if (sb.side === 'bottom') {
                x = W - local1; y = H - T; w = local1 - local0; h = T;
            } else {
                x = 0; y = H - local1; w = T; h = local1 - local0;
            }

            bricks.push({ x, y, w, h, side: sb.side });
        }
    }
    return bricks;
}

// Get neon brick color based on current strength
function getBrickNeonColor() {
    if (totalBricks > 9)  return { core: '#00ccff', glow: '#00eeff', light: '#66ddff', dark: '#0088bb' }; // Blue
    if (totalBricks > 6)  return { core: '#00ff88', glow: '#00ffaa', light: '#66ffbb', dark: '#00aa55' }; // Green
    if (totalBricks > 3)  return { core: '#ffcc00', glow: '#ffdd33', light: '#ffee77', dark: '#cc9900' }; // Yellow
    return                        { core: '#cc0022', glow: '#dd1133', light: '#ee4455', dark: '#880011' }; // Dark Red
}

let brickPulse = 0; // animated pulse timer

function drawBricks() {
    const allBricks = getAllBricks();
    const DEPTH = 4;
    const neon = getBrickNeonColor();
    brickPulse += 0.03;
    const pulseGlow = 12 + Math.sin(brickPulse) * 6; // oscillates 6–18

    allBricks.forEach((brick) => {
        if (brick.w < 2 || brick.h < 2) return;

        const safeR = Math.min(3, brick.w / 2, brick.h / 2);
        ctx.save();

        // ── 3D Extrusion shadow ──
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.roundRect(brick.x + DEPTH, brick.y + DEPTH, brick.w, brick.h, safeR);
        ctx.fill();

        // ── Side face (right edge) ──
        ctx.fillStyle = neon.dark;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(brick.x + brick.w, brick.y);
        ctx.lineTo(brick.x + brick.w + DEPTH, brick.y + DEPTH);
        ctx.lineTo(brick.x + brick.w + DEPTH, brick.y + brick.h + DEPTH);
        ctx.lineTo(brick.x + brick.w, brick.y + brick.h);
        ctx.closePath();
        ctx.fill();

        // ── Bottom face ──
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(brick.x, brick.y + brick.h);
        ctx.lineTo(brick.x + DEPTH, brick.y + brick.h + DEPTH);
        ctx.lineTo(brick.x + brick.w + DEPTH, brick.y + brick.h + DEPTH);
        ctx.lineTo(brick.x + brick.w, brick.y + brick.h);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // ── Main face: neon gradient ──
        ctx.shadowColor = neon.glow;
        ctx.shadowBlur = pulseGlow;

        const isHorizontal = (brick.side === 'top' || brick.side === 'bottom');
        const grad = isHorizontal
            ? ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h)
            : ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.w, brick.y);
        grad.addColorStop(0, neon.light);
        grad.addColorStop(0.3, neon.core);
        grad.addColorStop(0.7, neon.core);
        grad.addColorStop(1, neon.dark);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, safeR);
        ctx.fill();

        // ── Second glow pass for extra bloom ──
        ctx.shadowBlur = pulseGlow * 1.5;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // ── Inner highlight stripe (gives neon tube look) ──
        if (brick.w > 5 && brick.h > 5) {
            const innerR = Math.min(2, (brick.w - 4) / 2, (brick.h - 4) / 2);
            const hGrad = isHorizontal
                ? ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h)
                : ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.w, brick.y);
            hGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
            hGrad.addColorStop(0.35, 'rgba(255,255,255,0.15)');
            hGrad.addColorStop(0.65, 'rgba(255,255,255,0)');
            hGrad.addColorStop(1, 'rgba(0,0,0,0.15)');

            ctx.fillStyle = hGrad;
            ctx.beginPath();
            ctx.roundRect(brick.x + 2, brick.y + 2, brick.w - 4, brick.h - 4, innerR);
            ctx.fill();
        }

        // ── Neon outer border ──
        ctx.strokeStyle = neon.glow;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = neon.glow;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, safeR);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.restore();
    });
}

function playBrickHitSound() {
    // Impact thud
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3);
    gain1.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.35);

    // Metallic crunch
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start();
    osc2.stop(audioCtx.currentTime + 0.18);

    // Arena siren sweep
    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.type = 'square';
    osc3.frequency.setValueAtTime(250, audioCtx.currentTime + 0.05);
    osc3.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
    osc3.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.4);
    gain3.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain3.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 0.08);
    gain3.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    osc3.connect(gain3);
    gain3.connect(audioCtx.destination);
    osc3.start();
    osc3.stop(audioCtx.currentTime + 0.45);

    // Trigger screen shake
    screenShake = 8;
}

function checkBrickCollision() {
    if (!projectile || totalBricks <= 0) return false;
    const px = projectile.x;
    const py = projectile.y;
    const T = BRICK_THICKNESS;

    let hit = false;
    let burstX = px, burstY = py;

    if (py <= T) {
        hit = true; burstY = T / 2;
    } else if (py >= canvas.height - T) {
        hit = true; burstY = canvas.height - T / 2;
    } else if (px <= T) {
        hit = true; burstX = T / 2;
    } else if (px >= canvas.width - T) {
        hit = true; burstX = canvas.width - T / 2;
    }

    if (hit) {
        totalBricks--;
        updateStrengthBar();
        playBrickHitSound();
        // Big dramatic burst on brick hit
        spawnBurst(burstX, burstY, BRICK_COLOR, 25);
        spawnBurst(burstX, burstY, '#ff6b6b', 18);
        spawnBurst(burstX, burstY, '#ffd93d', 12);
        projectile = null;
        if (totalBricks <= 0) {
            gameOver = true;
            playGameOverSound();
            GameZone.gameOver(score, gameElapsedTime);
        }
        return true;
    }
    return false;
}

// Burst particle system
function spawnBurst(x, y, color, radius) {
    const count = 12 + Math.floor(radius);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
        const speed = 1.5 + Math.random() * 3;
        const size = 2 + Math.random() * 3;
        particles.push({
            x, y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            radius: size,
            color: color,
            life: 1.0,
            decay: 0.015 + Math.random() * 0.02
        });
    }
    // Add a ring flash
    particles.push({
        x, y,
        dx: 0, dy: 0,
        radius: radius * 0.5,
        color: color,
        life: 0.8,
        decay: 0.06,
        isRing: true,
        maxRadius: radius * 2.5
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        if (p.isRing) {
            p.radius += (p.maxRadius - p.radius) * 0.15;
        } else {
            p.x += p.dx;
            p.y += p.dy;
            p.dx *= 0.97;
            p.dy *= 0.97;
            p.radius *= 0.98;
        }
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        if (p.isRing) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.closePath();
        } else {
            // 3D glowing particle with radial gradient
            const pr = Math.max(0.5, p.radius);
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr * 1.8);
            grad.addColorStop(0, p.color);
            grad.addColorStop(0.4, p.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, pr * 1.8, 0, Math.PI * 2);
            ctx.fill();
            // Bright core
            ctx.beginPath();
            ctx.arc(p.x, p.y, pr * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = p.life * 0.6;
            ctx.fill();
            ctx.closePath();
        }
        ctx.restore();
    }
}

// ── Celebratory Score Popups ──
function drawScorePopups(dt) {
    const step = Math.min(dt, 0.05); // cap dt to prevent skipping
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const p = scorePopups[i];
        p.life -= step * 0.3; // lasts ~3.3 seconds
        if (p.life <= 0) { scorePopups.splice(i, 1); continue; }

        // Animate: scale up quickly then float up slowly
        p.scale = Math.min(p.scale + step * 4, 1.5);
        p.y -= step * 25;

        const bounce = p.scale > 1.0 ? 1.0 + Math.sin((1 - p.life) * Math.PI * 3) * 0.1 * p.life : p.scale;
        const fontSize = Math.floor(36 * bounce);

        ctx.save();
        ctx.globalAlpha = Math.min(p.life * 1.5, 1); // stay fully visible longer

        // Glow
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 25 * p.life;

        // Outline text
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 4;
        ctx.strokeText(p.text, p.x, p.y);

        // Fill with white
        ctx.fillStyle = '#fff';
        ctx.fillText(p.text, p.x, p.y);

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Shield System ──
function spawnShield() {
    // Spawn inside the playable area (within brick walls), away from player
    const margin = BRICK_THICKNESS + S(30);
    let x, y, attempts = 0;
    do {
        x = margin + Math.random() * (canvas.width - margin * 2);
        y = margin + Math.random() * (canvas.height - margin * 2);
        attempts++;
    } while (Math.hypot(x - player.x, y - player.y) < S(80) && attempts < 50);
    shield = { x, y, radius: S(SHIELD_BASE_RADIUS), spawnTime: performance.now(), duration: 5000, pulse: 0 }; // 5 real seconds
}

function updateShield(dt) {
    // Shield spawns when: strength < 6 AND earned 75+ points since last shield
    if (!shield && !gameOver && totalBricks < 6 && (score - shieldLastScore) >= SHIELD_INTERVAL) {
        spawnShield();
        shieldLastScore = score;
    }

    // Update shield timer (real wall-clock time — immune to frame spikes)
    if (shield) {
        const elapsed = performance.now() - shield.spawnTime;
        const remaining = shield.duration - elapsed;
        shield.pulse += Math.min(dt, 1.5) * 0.07;
        if (remaining <= 0) {
            shield = null; // expired after exactly 5 seconds
        }
    }

    // Check projectile-shield collision
    if (shield && projectile) {
        const dist = Math.hypot(projectile.x - shield.x, projectile.y - shield.y);
        if (dist < shield.radius + 8) {
            // Shield collected!
            const added = Math.min(6, TOTAL_BRICKS_START - totalBricks);
            totalBricks += added;
            updateStrengthBar();
            spawnBurst(shield.x, shield.y, '#00ffcc', 30);
            spawnBurst(shield.x, shield.y, '#66ffff', 20);
            playShieldSound();

            // Score popup for shield
            scorePopups.push({
                x: shield.x,
                y: shield.y - 20,
                text: '+' + added + ' \u{1F6E1}',
                color: '#00ffcc',
                life: 1.0,
                scale: 0
            });

            shield = null;
            projectile = null;
        }
    }
}

function drawShield() {
    if (!shield) return;
    const s = shield;
    const pulse = 1 + Math.sin(s.pulse) * 0.15;
    const r = s.radius * pulse;

    // Blink faster when about to expire (last ~1.5 seconds)
    const remaining = s.duration - (performance.now() - s.spawnTime);
    if (remaining < 1500 && Math.sin(s.pulse * 8) > 0.3) return;

    ctx.save();

    // Outer glow
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 25;

    // Shield body — glowing circle with gradient
    const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    grad.addColorStop(0, 'rgba(0,255,204,0.9)');
    grad.addColorStop(0.5, 'rgba(0,200,170,0.6)');
    grad.addColorStop(1, 'rgba(0,150,130,0.2)');
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Shield icon — draw shield.png inside
    ctx.shadowBlur = 0;
    if (shieldImg.complete && shieldImg.naturalWidth > 0) {
        const imgSize = r * 1.4;
        ctx.drawImage(shieldImg, s.x - imgSize / 2, s.y - imgSize / 2, imgSize, imgSize);
    }

    // Ring border
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,255,204,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

function playShieldSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
}

const MIN_BUBBLE_BASE_GAP = 15; // minimum gap between bubble edges

function isTooClose(x, y, radius) {
    // Check distance from player
    if (Math.hypot(x - player.x, y - player.y) < player.radius + radius + S(50)) {
        return true;
    }
    // Check distance from all existing bubbles
    for (const b of bubbles) {
        const dist = Math.hypot(x - b.x, y - b.y);
        if (dist < b.radius + radius + S(MIN_BUBBLE_BASE_GAP)) {
            return true;
        }
    }
    return false;
}

function createBubble(type) {
    let x, y, attempts = 0;
    const minX = BRICK_THICKNESS + type.radius + 2;
    const maxX = canvas.width - BRICK_THICKNESS - type.radius - 2;
    const minY = BRICK_THICKNESS + type.radius + 2;
    const maxY = canvas.height - BRICK_THICKNESS - type.radius - 2;
    do {
        x = Math.random() * (maxX - minX) + minX;
        y = Math.random() * (maxY - minY) + minY;
        attempts++;
    } while (isTooClose(x, y, type.radius) && attempts < 500);

    return {
        x,
        y,
        radius: type.radius,
        points: type.points,
        color: type.color
    };
}

function createBubbleByColor(color) {
    const type = bubbleTypes.find(t => t.color === color) || bubbleTypes[0];
    return createBubble(type);
}

function initBubbles() {
    bubbles = [];
    for (const type of bubbleTypes) {
        for (let i = 0; i < type.count; i++) {
            bubbles.push(createBubble(type));
        }
    }
}

function drawPlayer() {
    const pr = player.radius;

    // ── Drop shadow ──
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(player.x + pr * 0.12, player.y + pr * 0.7, pr * 0.75, pr * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Player bubble image (rotates with arrow, clipped to circle) ──
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Clip to circle
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.clip();

    if (firingBubbleImg.complete && firingBubbleImg.naturalWidth > 0) {
        const size = pr * 2.4;
        ctx.drawImage(firingBubbleImg, -size / 2, -size / 2, size, size);
    } else {
        ctx.fillStyle = '#b0b0c0';
        ctx.fill();
    }

    ctx.restore();
}

let time = 0;

function drawBubbles() {
    time += 0.02;
    bubbles.forEach((bubble, idx) => {
        const pulse = 1 + Math.sin(time + idx * 0.7) * 0.04;
        const r = bubble.radius * pulse;
        const img = bubbleImages[bubble.color];

        ctx.save();

        // ── Drop shadow ──
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(bubble.x + r * 0.15, bubble.y + r * 0.85, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── Draw bubble image (or fallback to colored circle) ──
        if (img && img.complete && img.naturalWidth > 0) {
            const size = r * 2.2; // slightly larger than radius for visual match
            ctx.drawImage(img, bubble.x - size / 2, bubble.y - size / 2, size, size);
        } else {
            // Fallback: simple colored circle
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, r, 0, Math.PI * 2);
            ctx.fillStyle = bubble.color;
            ctx.fill();
            ctx.closePath();
        }

        ctx.restore();
    });
}

// Helper: lighten a hex color
function lightenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
    const b = Math.min(255, (num & 0x0000FF) + amount);
    return `rgb(${r},${g},${b})`;
}

// Helper: darken a hex color
function darkenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    const b = Math.max(0, (num & 0x0000FF) - amount);
    return `rgb(${r},${g},${b})`;
}

let projectileTrail = [];

function drawProjectile() {
    if (projectile) {
        // Track trail points
        projectileTrail.push({ x: projectile.x, y: projectile.y, life: 1.0 });
        if (projectileTrail.length > 12) projectileTrail.shift();

        // ── Draw trailing bullet copies (fading behind main) ──
        ctx.save();
        for (let i = 0; i < projectileTrail.length; i++) {
            const t = projectileTrail[i];
            t.life -= 0.06;
            if (t.life <= 0) continue;
            if (bulletImg.complete && bulletImg.naturalWidth > 0) {
                const trailSize = S(28) * t.life;
                ctx.globalAlpha = t.life * 0.5;
                ctx.drawImage(bulletImg, t.x - trailSize / 2, t.y - trailSize / 2, trailSize, trailSize);
            }
        }
        ctx.restore();

        // ── Main bullet image ──
        if (bulletImg.complete && bulletImg.naturalWidth > 0) {
            const size = S(32);
            ctx.drawImage(bulletImg, projectile.x - size / 2, projectile.y - size / 2, size, size);
        } else {
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, S(10), 0, Math.PI * 2);
            ctx.fillStyle = '#c0d0ff';
            ctx.fill();
            ctx.closePath();
        }
    } else {
        projectileTrail = [];
    }
}

let lastTime = 0;

function update(timestamp) {
    if (!lastTime) lastTime = timestamp;

    // Update elapsed time
    if (!gameOver && !gamePaused && gameStartTime) {
        gameElapsedTime = Math.round((performance.now() - gameStartTime - totalPauseTime) / 1000);

        // Time-limited game: show countdown and trigger game over when expired
        if (GameHUD.hasTimeLimit) {
            const remaining = Math.max(0, GameHUD.timeLimitSeconds - gameElapsedTime);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            timeDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

            if (remaining <= 0) {
                gameOver = true;
                playGameOverSound();
                GameZone.gameOver(score, gameElapsedTime);
            }
        } else {
            const mins = Math.floor(gameElapsedTime / 60);
            const secs = gameElapsedTime % 60;
            timeDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }

        liveScoreEl.textContent = GameZone.calcScore(score, gameElapsedTime);
        GameHUD.updateScore(GameZone.calcScore(score, gameElapsedTime));
    }

    // Skip game logic when paused
    if (gamePaused) {
        requestAnimationFrame(update);
        return;
    }

    const dt = Math.min((timestamp - lastTime) / 16.67, 3); // normalize to 60fps, cap at 3x
    lastTime = timestamp;

    // Rotate arrow
    player.angle += 0.02 * dt;

    // Move projectile with sub-stepping
    if (projectile) {
        const steps = Math.ceil(dt);
        const stepDx = projectile.dx * dt / steps;
        const stepDy = projectile.dy * dt / steps;

        for (let s = 0; s < steps && projectile; s++) {
            projectile.x += stepDx;
            projectile.y += stepDy;

            // Check for collision with bubbles
            let hitBubble = false;
            for (let i = bubbles.length - 1; i >= 0; i--) {
                const bubble = bubbles[i];
                const dist = Math.hypot(projectile.x - bubble.x, projectile.y - bubble.y);

                if (dist < bubble.radius + S(5)) {
                    // Collision detected
                    spawnBurst(bubble.x, bubble.y, bubble.color, bubble.radius);
                    playPopSound(bubble.color);
                    score += bubble.points;
                    scoreEl.textContent = score;
                    GameHUD.updateScore(GameZone.calcScore(score, gameElapsedTime));

                    // Spawn celebratory score popup
                    scorePopups.push({
                        x: bubble.x,
                        y: bubble.y,
                        text: '+' + bubble.points,
                        color: bubble.color,
                        life: 1.0,
                        scale: 0
                    });

                    player.x = bubble.x;
                    player.y = bubble.y;

                    bubbles.splice(i, 1);
                    bubbles.push(createBubbleByColor(bubble.color));

                    projectile = null;
                    hitBubble = true;
                    break;
                }
            }
            if (hitBubble) break;

            // Check brick collision
            if (projectile && checkBrickCollision()) {
                break;
            }

            // Remove projectile if it reaches brick boundary
            if (projectile && (projectile.x < BRICK_THICKNESS || projectile.x > canvas.width - BRICK_THICKNESS || projectile.y < BRICK_THICKNESS || projectile.y > canvas.height - BRICK_THICKNESS)) {
                projectile = null;
                break;
            }
        }
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Static background image
    if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        GameBackground.draw(ctx, dt);
    }

    // Clouds drifting left to right
    if (cloudsImg.complete && cloudsImg.naturalWidth > 0) {
        cloudAngle += dt * 0.15; // horizontal scroll speed (pixels per second)
        if (cloudAngle >= canvas.width) cloudAngle -= canvas.width;
        ctx.save();
        ctx.globalAlpha = 0.4;
        // Draw two copies for seamless horizontal loop
        ctx.drawImage(cloudsImg, cloudAngle - canvas.width, 0, canvas.width, canvas.height);
        ctx.drawImage(cloudsImg, cloudAngle, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Screen shake effect
    if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.save();
        ctx.translate(shakeX, shakeY);
        screenShake *= 0.85;
        if (screenShake < 0.5) screenShake = 0;
    }

    updateParticles();

    // ── Shield logic ──
    updateShield(dt);

    drawBricks();
    drawBubbles();
    drawShield();
    drawPlayer();
    drawProjectile();
    drawParticles();
    drawScorePopups(dt);

    if (GameZone.isGameOver) {
        GameZone.drawGameOver();
    }

    // End screen shake
    if (screenShake > 0 || ctx.getTransform().e !== 0) {
        ctx.restore();
    }

    requestAnimationFrame(update);
}

let fireCooldown = 0;

function getCanvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function fire(canvasX, canvasY) {
    if (gameOver) return;
    const now = performance.now();
    if (!projectile && now - fireCooldown > 300) {
        fireCooldown = now;
        playShootSound();
        const speed = S(10);
        projectile = {
            x: player.x,
            y: player.y,
            dx: Math.cos(player.angle) * speed,
            dy: Math.sin(player.angle) * speed
        };
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameOver) fire();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    fire(pos.x, pos.y);
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    fire(pos.x, pos.y);
});



window.addEventListener('resize', () => {
    resizeCanvas();
    // Update scale factor for new canvas size
    scaleFactor = canvas.width / REF_WIDTH;
    bubbleTypes = BUBBLE_BASE.map(b => ({ ...b, radius: S(b.baseRadius) }));
    player.radius = S(28);
    player.arrowLength = S(40);
    BRICK_THICKNESS = S(BRICK_BASE_THICKNESS);
    BRICK_GAP = S(BRICK_BASE_GAP);
    GameBackground.resize(canvas.width, canvas.height);
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    initWalls();
    initBubbles();
});

initWalls();
initBubbles();
gameStartTime = performance.now();

// ── Pause button ──
const pauseBtn = document.getElementById('pause-btn');
function togglePause() {
    if (gameOver) return;
    if (gamePaused) {
        totalPauseTime += performance.now() - pauseStartTime;
        gamePaused = false;
        lastTime = 0;
        pauseBtn.innerHTML = '&#9208;'; // ⏸
        pauseBtn.title = 'Pause';
    } else {
        gamePaused = true;
        pauseStartTime = performance.now();
        pauseBtn.innerHTML = '&#9654;'; // ▶
        pauseBtn.title = 'Resume';
    }
}
pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
});

// ── Leaderboard integration ──
const lbBtn = document.getElementById('lb-btn');
lbBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    GameZone.toggleLeaderboard();
});

GameZone.onLeaderboardOpen(() => {
    if (isMobile() && !gamePaused) {
        gamePaused = true;
        pauseStartTime = performance.now();
        pauseBtn.innerHTML = '&#9654;';
        pauseBtn.title = 'Resume';
    }
});

GameZone.onLeaderboardClose(() => {
    if (gamePaused) {
        totalPauseTime += performance.now() - pauseStartTime;
        gamePaused = false;
        lastTime = 0;
        pauseBtn.innerHTML = '&#9208;';
        pauseBtn.title = 'Pause';
    }
});

// ── Init GameZone SDK ──
GameZone.init({
    canvas,
    ctx,
    slug: 'bubble-shooter',
    onRestart: restartGame,
    container: document.getElementById('game-container')
});

requestAnimationFrame(update);
