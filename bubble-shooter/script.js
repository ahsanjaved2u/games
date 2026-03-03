const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
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
    const maxH = isMobileView ? window.innerHeight : window.innerHeight * 0.92;
    const hoodH = document.getElementById('hood').offsetHeight || 48;
    // Portrait: width < height, target ~9:16 aspect
    let h = maxH - hoodH;
    let w = h * (9 / 16);
    if (w > maxW) {
        w = maxW;
        h = w * (16 / 9);
    }
    canvas.width = Math.floor(w);
    canvas.height = Math.floor(h);
    // Sync container width so hood matches canvas
    const container = document.getElementById('game-container');
    container.style.width = canvas.width + 'px';
}
resizeCanvas();
GameBackground.init(canvas.width, canvas.height);

let score = 0;

const bubbleTypes = [
    { color: '#c45c5c', radius: 10, points: 3, count: 4 }, // Soft Red - small
    { color: '#c4a84e', radius: 13, points: 2, count: 4 }, // Soft Yellow - medium
    { color: '#5aab5a', radius: 18, points: 1, count: 4 }  // Soft Green - large
];

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    color: '#ffffff',
    angle: 0,
    arrowLength: 40
};

let projectile = null;
let bubbles = [];
let particles = [];
let gameOver = false;
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

let gameOverResult = null; // { entries, score, rank }
let tryAgainBtn = null; // { x, y, w, h } — canvas-drawn button bounds

function drawGameOver() {
    const finalScore = Leaderboard.calcScore(score, gameElapsedTime);
    const cx = canvas.width / 2;
    const W = canvas.width;
    const H = canvas.height;

    // Add to leaderboard once
    if (!gameOverResult) {
        gameOverResult = Leaderboard.addEntry('You', score, gameElapsedTime);
    }

    const entries = gameOverResult.entries;
    const playerRank = gameOverResult.rank;

    // Full dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // ── Size helpers: sw = width-based, sh = height-based ──
    const sw = (f) => Math.floor(W * f);
    const sh = (f) => Math.floor(H * f);

    // ── Header section (GAME OVER + score + rank) ──
    let y = sh(0.025);

    // GAME OVER title
    ctx.fillStyle = '#ff4757';
    ctx.font = `bold ${sh(0.035)}px Arial`;
    ctx.fillText('GAME OVER', cx, y);
    y += sh(0.042);

    // Big score
    ctx.fillStyle = '#ffd93d';
    ctx.font = `bold ${sh(0.05)}px Arial`;
    ctx.fillText(finalScore, cx, y);
    y += sh(0.027);

    // "SCORE" label + points/time on same line
    const mins = Math.floor(gameElapsedTime / 60);
    const secs = gameElapsedTime % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    ctx.fillStyle = '#999';
    ctx.font = `${sh(0.016)}px Arial`;
    ctx.fillText(`SCORE  ·  Points: ${score}  ·  Time: ${timeStr}`, cx, y);
    y += sh(0.03);

    // Rank badge
    ctx.fillStyle = playerRank <= 3 ? '#ffd93d' : '#00e5ff';
    ctx.font = `bold ${sh(0.022)}px Arial`;
    ctx.fillText(`🏅 Your Rank: #${playerRank}`, cx, y);
    y += sh(0.03);

    // ── Leaderboard table — fill remaining space minus button area ──
    const btnAreaH = sh(0.08);  // space reserved for button at bottom
    const tableTop = y;
    const tableBottom = H - btnAreaH;
    const tableH = tableBottom - tableTop;
    const tableW = W * 0.94;
    const tableL = (W - tableW) / 2;

    // Compute row height dynamically from available space
    const numRows = entries.length;
    const headerH = tableH * 0.1;
    const rowH = (tableH - headerH - 4) / numRows;
    const fontSize = Math.floor(Math.min(rowH * 0.52, sw(0.028)));

    // Table bg
    ctx.fillStyle = 'rgba(10,10,30,0.9)';
    ctx.beginPath();
    ctx.roundRect(tableL, tableTop, tableW, tableH, 6);
    ctx.fill();

    // Table border
    ctx.strokeStyle = 'rgba(0,229,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tableL, tableTop, tableW, tableH, 6);
    ctx.stroke();

    // Column layout
    const cols = [
        { label: 'Rank', x: tableL + tableW * 0.08 },
        { label: 'Name', x: tableL + tableW * 0.27 },
        { label: 'Pts',  x: tableL + tableW * 0.48 },
        { label: 'Time', x: tableL + tableW * 0.68 },
        { label: 'Score',x: tableL + tableW * 0.89 }
    ];

    // Header bg
    ctx.fillStyle = 'rgba(0,229,255,0.06)';
    ctx.fillRect(tableL + 1, tableTop + 1, tableW - 2, headerH);

    // Header text
    ctx.font = `bold ${Math.floor(headerH * 0.5)}px Arial`;
    cols.forEach(col => {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,229,255,0.6)';
        ctx.fillText(col.label, col.x, tableTop + headerH / 2);
    });

    // Header separator
    ctx.strokeStyle = 'rgba(0,229,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(tableL + 3, tableTop + headerH);
    ctx.lineTo(tableL + tableW - 3, tableTop + headerH);
    ctx.stroke();

    // Medal colors
    const medalColors = ['#ffd93d', '#c0c0c0', '#cd7f32'];
    const rowColors   = ['#e8d48f', '#c8c8c8', '#c9a06c'];

    // Rows
    entries.forEach((e, i) => {
        const rowY = tableTop + headerH + rowH * i + rowH / 2;
        const isPlayer = (e.name === 'You' && e.score === gameOverResult.score);

        // Player row highlight
        if (isPlayer) {
            ctx.fillStyle = 'rgba(0,229,255,0.08)';
            ctx.fillRect(tableL + 1, rowY - rowH / 2, tableW - 2, rowH);
        } else if (i % 2 === 1) {
            ctx.fillStyle = 'rgba(255,255,255,0.012)';
            ctx.fillRect(tableL + 1, rowY - rowH / 2, tableW - 2, rowH);
        }

        const base = i < 3 ? rowColors[i] : (isPlayer ? '#00e5ff' : '#999');
        const rkCol = i < 3 ? medalColors[i] : (isPlayer ? '#00e5ff' : '#666');

        ctx.textAlign = 'center';

        // Rank
        ctx.fillStyle = rkCol;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText(i + 1, cols[0].x, rowY);

        // Name
        ctx.fillStyle = isPlayer ? '#00e5ff' : base;
        ctx.font = isPlayer ? `bold ${fontSize}px Arial` : `${fontSize}px Arial`;
        ctx.fillText(e.name, cols[1].x, rowY);

        // Pts
        ctx.fillStyle = base;
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText(e.points, cols[2].x, rowY);

        // Time
        ctx.fillText(Leaderboard.formatTime(e.time), cols[3].x, rowY);

        // Score
        ctx.fillStyle = isPlayer ? '#00e5ff' : (i < 3 ? medalColors[i] : '#00e5ff');
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText(e.score, cols[4].x, rowY);
    });

    // ── "Try Again" button ──
    const btnW = W * 0.55;
    const btnH = sh(0.052);
    const btnX = cx - btnW / 2;
    const btnY = tableBottom + (btnAreaH - btnH) / 2;
    const btnR = btnH / 2; // pill shape

    // Animated glow pulse
    const glowPulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.004);
    const outerGlow = 18 + 10 * glowPulse;

    // Outer neon glow aura
    ctx.save();
    ctx.shadowColor = `rgba(0, 255, 255, ${0.5 * glowPulse})`;
    ctx.shadowBlur = outerGlow;
    ctx.fillStyle = 'rgba(0,229,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(btnX - 4, btnY - 4, btnW + 8, btnH + 8, btnR + 4);
    ctx.fill();
    ctx.restore();

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(btnX + 2, btnY + 3, btnW, btnH, btnR);
    ctx.fill();

    // Main neon gradient body
    ctx.save();
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, '#00ffcc');
    btnGrad.addColorStop(0.3, '#00e5ff');
    btnGrad.addColorStop(0.7, '#00b0ff');
    btnGrad.addColorStop(1, '#6c5ce7');
    ctx.fillStyle = btnGrad;
    ctx.shadowColor = 'rgba(0,229,255,0.7)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, btnR);
    ctx.fill();
    ctx.restore();

    // Inner shine (top half glossy)
    ctx.save();
    ctx.globalAlpha = 0.35;
    const shineGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH * 0.5);
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shineGrad;
    ctx.beginPath();
    ctx.roundRect(btnX + 2, btnY + 1, btnW - 4, btnH * 0.48, [btnR, btnR, 0, 0]);
    ctx.fill();
    ctx.restore();

    // Neon border
    ctx.save();
    ctx.strokeStyle = `rgba(0,255,255,${0.4 + 0.3 * glowPulse})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,255,255,0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, btnR);
    ctx.stroke();
    ctx.restore();

    // Button text with glow
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${sh(0.024)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText('\u27F3  Try Again', cx, btnY + btnH / 2);
    ctx.restore();

    // Store button bounds for hit-testing
    tryAgainBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
}

function restartGame() {
    score = 0;
    scoreEl.textContent = score;
    gameOver = false;
    gameOverResult = null;
    tryAgainBtn = null;
    gamePaused = false;
    projectile = null;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    gameStartTime = performance.now();
    totalPauseTime = 0;
    gameElapsedTime = 0;
    timeDisplay.textContent = '0:00';
    liveScoreEl.textContent = '0';
    initWalls();
    initBubbles();
}

// Brick system - 12 bricks distributed around the full perimeter
const BRICK_THICKNESS = 12;
const BRICK_GAP = 3;
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

function drawBricks() {
    const allBricks = getAllBricks();
    const DEPTH = 4; // 3D extrusion depth in pixels

    allBricks.forEach((brick) => {
        // Skip tiny brick fragments that can't be rendered
        if (brick.w < 2 || brick.h < 2) return;

        const color = BRICK_COLOR;
        const safeR = Math.min(3, brick.w / 2, brick.h / 2);

        ctx.save();

        // ── 3D Extrusion shadow (dark offset behind the brick) ──
        ctx.fillStyle = darkenColor(color, 80);
        ctx.beginPath();
        ctx.roundRect(brick.x + DEPTH, brick.y + DEPTH, brick.w, brick.h, safeR);
        ctx.fill();

        // ── Side face (right edge) for horizontal or bottom edge for vertical ──
        ctx.fillStyle = darkenColor(color, 55);
        ctx.beginPath();
        // Right face
        ctx.moveTo(brick.x + brick.w, brick.y);
        ctx.lineTo(brick.x + brick.w + DEPTH, brick.y + DEPTH);
        ctx.lineTo(brick.x + brick.w + DEPTH, brick.y + brick.h + DEPTH);
        ctx.lineTo(brick.x + brick.w, brick.y + brick.h);
        ctx.closePath();
        ctx.fill();
        // Bottom face
        ctx.fillStyle = darkenColor(color, 65);
        ctx.beginPath();
        ctx.moveTo(brick.x, brick.y + brick.h);
        ctx.lineTo(brick.x + DEPTH, brick.y + brick.h + DEPTH);
        ctx.lineTo(brick.x + brick.w + DEPTH, brick.y + brick.h + DEPTH);
        ctx.lineTo(brick.x + brick.w, brick.y + brick.h);
        ctx.closePath();
        ctx.fill();

        // ── Main top face with glow ──
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;

        const isHorizontal = (brick.side === 'top' || brick.side === 'bottom');
        const grad = isHorizontal
            ? ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h)
            : ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.w, brick.y);
        grad.addColorStop(0, lightenColor(color, 50));
        grad.addColorStop(0.4, lightenColor(color, 15));
        grad.addColorStop(0.6, color);
        grad.addColorStop(1, darkenColor(color, 25));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, safeR);
        ctx.fill();
        ctx.shadowBlur = 0;

        // ── Top bevel highlight ──
        if (brick.w > 4 && brick.h > 4) {
            const innerR = Math.min(2, (brick.w - 2) / 2, (brick.h - 2) / 2);
            // Bright top-left inner edge
            ctx.strokeStyle = lightenColor(color, 70);
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.roundRect(brick.x + 1, brick.y + 1, brick.w - 2, brick.h - 2, innerR);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // ── Crisp outer edge ──
        ctx.strokeStyle = darkenColor(color, 50);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, safeR);
        ctx.stroke();

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

const MIN_BUBBLE_GAP = 15; // minimum gap between bubble edges

function isTooClose(x, y, radius) {
    // Check distance from player
    if (Math.hypot(x - player.x, y - player.y) < player.radius + radius + 50) {
        return true;
    }
    // Check distance from all existing bubbles
    for (const b of bubbles) {
        const dist = Math.hypot(x - b.x, y - b.y);
        if (dist < b.radius + radius + MIN_BUBBLE_GAP) {
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

    // ── 3D Drop shadow ──
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(player.x + pr * 0.12, player.y + pr * 0.7, pr * 0.75, pr * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 3D Sphere body ──
    const sphereGrad = ctx.createRadialGradient(
        player.x - pr * 0.3, player.y - pr * 0.35, pr * 0.05,
        player.x + pr * 0.1, player.y + pr * 0.1, pr * 1.05
    );
    sphereGrad.addColorStop(0, '#ffffff');
    sphereGrad.addColorStop(0.3, '#e8e8f0');
    sphereGrad.addColorStop(0.6, '#b0b0c0');
    sphereGrad.addColorStop(0.85, '#707088');
    sphereGrad.addColorStop(1, '#404058');

    ctx.beginPath();
    ctx.arc(player.x, player.y, pr, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.shadowColor = 'rgba(180,200,255,0.5)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;

    // ── Rim light ──
    ctx.save();
    ctx.globalAlpha = 0.15;
    const rimGrad = ctx.createRadialGradient(
        player.x + pr * 0.35, player.y + pr * 0.35, pr * 0.5,
        player.x, player.y, pr * 1.05
    );
    rimGrad.addColorStop(0, 'rgba(255,255,255,0)');
    rimGrad.addColorStop(0.8, 'rgba(255,255,255,0)');
    rimGrad.addColorStop(1, 'rgba(150,180,255,0.7)');
    ctx.beginPath();
    ctx.arc(player.x, player.y, pr, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.restore();

    // ── Specular highlight ──
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(player.x - pr * 0.25, player.y - pr * 0.3, pr * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();

    // ── Border ──
    ctx.beginPath();
    ctx.arc(player.x, player.y, pr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100,100,140,0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.closePath();

    // Draw rotating arrow
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(player.arrowLength, 0);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.closePath();
    ctx.shadowBlur = 0;
    ctx.restore();
}

let time = 0;

function drawBubbles() {
    time += 0.02;
    bubbles.forEach((bubble, idx) => {
        const pulse = 1 + Math.sin(time + idx * 0.7) * 0.04;
        const r = bubble.radius * pulse;

        ctx.save();

        // ── 3D Drop shadow (ellipse below bubble) ──
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(bubble.x + r * 0.15, bubble.y + r * 0.85, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── 3D Spherical body gradient (lit from top-left) ──
        const grad = ctx.createRadialGradient(
            bubble.x - r * 0.35, bubble.y - r * 0.35, r * 0.05,
            bubble.x + r * 0.1, bubble.y + r * 0.1, r * 1.05
        );
        grad.addColorStop(0, lightenColor(bubble.color, 80));
        grad.addColorStop(0.25, lightenColor(bubble.color, 35));
        grad.addColorStop(0.55, bubble.color);
        grad.addColorStop(0.8, darkenColor(bubble.color, 45));
        grad.addColorStop(1, darkenColor(bubble.color, 75));

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.closePath();

        // ── Dark border for depth ──
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = darkenColor(bubble.color, 70);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.closePath();

        // ── 3D Rim light (bottom-right edge catch light) ──
        ctx.save();
        ctx.globalAlpha = 0.18;
        const rimGrad = ctx.createRadialGradient(
            bubble.x + r * 0.4, bubble.y + r * 0.4, r * 0.6,
            bubble.x + r * 0.3, bubble.y + r * 0.3, r * 1.05
        );
        rimGrad.addColorStop(0, 'rgba(255,255,255,0)');
        rimGrad.addColorStop(0.7, 'rgba(255,255,255,0)');
        rimGrad.addColorStop(1, 'rgba(200,220,255,0.6)');
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, r, 0, Math.PI * 2);
        ctx.fillStyle = rimGrad;
        ctx.fill();
        ctx.restore();

        // ── 3D Specular highlight (top-left bright spot) ──
        const shineGrad = ctx.createRadialGradient(
            bubble.x - r * 0.32, bubble.y - r * 0.38, r * 0.02,
            bubble.x - r * 0.15, bubble.y - r * 0.2, r * 0.45
        );
        shineGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
        shineGrad.addColorStop(0.3, 'rgba(255,255,255,0.35)');
        shineGrad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, r, 0, Math.PI * 2);
        ctx.fillStyle = shineGrad;
        ctx.fill();
        ctx.closePath();

        // ── Secondary small highlight (adds realism) ──
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(bubble.x - r * 0.25, bubble.y - r * 0.3, r * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.restore();

        ctx.restore();

        // Draw score number inside bubble (with subtle shadow for depth)
        ctx.save();
        ctx.font = `bold ${Math.floor(r * 0.9)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillText(bubble.points, bubble.x + 1, bubble.y + 1);
        ctx.fillStyle = '#000';
        ctx.fillText(bubble.points, bubble.x, bubble.y);
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

        // ── Draw comet trail ──
        ctx.save();
        for (let i = 0; i < projectileTrail.length; i++) {
            const t = projectileTrail[i];
            t.life -= 0.06;
            if (t.life <= 0) continue;
            const trailR = 3 * t.life;
            const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, trailR * 2);
            grad.addColorStop(0, `rgba(200,220,255,${t.life * 0.4})`);
            grad.addColorStop(1, 'rgba(100,150,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(t.x, t.y, trailR * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // ── 3D Projectile sphere ──
        const pr = 5;
        const grad = ctx.createRadialGradient(
            projectile.x - pr * 0.3, projectile.y - pr * 0.3, pr * 0.1,
            projectile.x, projectile.y, pr
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#c0d0ff');
        grad.addColorStop(1, '#5570aa');

        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, pr, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(150,200,255,0.8)';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
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
        const mins = Math.floor(gameElapsedTime / 60);
        const secs = gameElapsedTime % 60;
        timeDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        liveScoreEl.textContent = Leaderboard.calcScore(score, gameElapsedTime);
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

                if (dist < bubble.radius + 5) {
                    // Collision detected
                    spawnBurst(bubble.x, bubble.y, bubble.color, bubble.radius);
                    playPopSound(bubble.color);
                    score += bubble.points;
                    scoreEl.textContent = score;

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

    // Animated background
    GameBackground.draw(ctx, dt);

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

    drawBricks();
    drawBubbles();
    drawPlayer();
    drawProjectile();
    drawParticles();

    if (gameOver) {
        drawGameOver();
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

function isTryAgainHit(cx, cy) {
    if (!tryAgainBtn) return false;
    const b = tryAgainBtn;
    return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h;
}

function fire(canvasX, canvasY) {
    if (gameOver) {
        // Only restart if Try Again button is clicked/tapped
        if (canvasX !== undefined && isTryAgainHit(canvasX, canvasY)) {
            restartGame();
        }
        return;
    }
    const now = performance.now();
    if (!projectile && now - fireCooldown > 300) {
        fireCooldown = now;
        playShootSound();
        const speed = 10;
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

// Pointer cursor on Try Again button hover
canvas.addEventListener('mousemove', (e) => {
    if (gameOver && tryAgainBtn) {
        const pos = getCanvasPos(e.clientX, e.clientY);
        canvas.style.cursor = isTryAgainHit(pos.x, pos.y) ? 'pointer' : 'default';
    } else {
        if (canvas.style.cursor !== 'default') canvas.style.cursor = 'default';
    }
});

window.addEventListener('resize', () => {
    resizeCanvas();
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
    Leaderboard.toggle();
});

Leaderboard.onOpen(() => {
    if (isMobile() && !gamePaused) {
        gamePaused = true;
        pauseStartTime = performance.now();
        pauseBtn.innerHTML = '&#9654;';
        pauseBtn.title = 'Resume';
    }
});

Leaderboard.onClose(() => {
    if (gamePaused) {
        totalPauseTime += performance.now() - pauseStartTime;
        gamePaused = false;
        lastTime = 0;
        pauseBtn.innerHTML = '&#9208;';
        pauseBtn.title = 'Pause';
    }
});

requestAnimationFrame(update);
