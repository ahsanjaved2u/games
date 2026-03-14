# GameZone — New Game Development Guide
> **Audience**: AI agents and developers building new games for the GameZone platform.
> **Last updated**: March 2026

---

## 1. Folder Structure

Every game lives in `frontend/public/games/<game-slug>/` and MUST contain:

```
frontend/public/games/<game-slug>/
├── index.html       ← Entry point loaded in iframe
├── hud.js           ← COPY from bubble-shooter/hud.js — self-contained (injects hood HTML + CSS)
├── script.js        ← Your game logic
├── style.css        ← (optional) Game-specific styles only (e.g., custom stat elements)
├── images/          ← Game assets
└── (optional) background.js, sounds/, etc.
```

> **IMPORTANT**: `hud.js` is fully self-contained — it injects all hood HTML, hood CSS, page reset, and layout styles automatically. Copy it verbatim from `bubble-shooter/hud.js`. Do NOT modify its interface. A `style.css` is only needed if your game has custom HUD stats or visual overrides.

---

## 2. Required Script Load Order (in index.html)

```html
<script src="hud.js"></script>
<script src="/sdk/gamezone-sdk.js"></script>
<script src="script.js"></script>
```

`hud.js` MUST load before the SDK. The SDK MUST load before your game script. The SDK is located at `/sdk/gamezone-sdk.js` (absolute path from public root).

---

## 3. Required HTML Structure

`hud.js` automatically injects the `#hood` bar (with Points, Time, Score, PKR, Pause, Leaderboard buttons) and all shared CSS (page reset, body, layout, hood styles). Your `index.html` only needs the bare container:

### Minimal index.html Template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Game Name</title>
    <!-- Only needed if you have game-specific styles -->
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <div id="game-wrapper">
            <canvas id="gameCanvas"></canvas>
        </div>
    </div>
    <script src="hud.js"></script>
    <script src="/sdk/gamezone-sdk.js"></script>
    <script src="script.js"></script>
</body>
</html>
```

> **DO NOT** add `#hood` HTML manually — `hud.js` creates it automatically.

### Elements auto-created by hud.js:

| ID | Element | Purpose |
|---|---|---|
| `hood` | `<div>` | The top bar — injected into `#game-container` before `#game-wrapper` |
| `score` | `<span>` | Raw points display |
| `time-display` | `<span>` | Timer display (count-up or countdown) |
| `live-score` | `<span>` | Calculated leaderboard score display |
| `pkr-btn` | `<div>` | PKR currency container — auto-shown by config |
| `pkr-amount` | `<span>` | PKR amount value |
| `pause-btn` | `<button>` | Pause/resume toggle |
| `lb-btn` | `<button>` | Leaderboard toggle |

### Elements YOU must provide in index.html:

| ID | Element | Purpose |
|---|---|---|
| `game-container` | `<div>` | Wrapper — SDK + hud.js depend on this |
| `game-wrapper` | `<div>` | Canvas wrapper |
| `gameCanvas` | `<canvas>` | Main game canvas |

---

## 4. SDK API Reference (GameZone)

The SDK is at `/sdk/gamezone-sdk.js` and exposes a global `GameZone` object.

### 4.1 MUST call at game boot:

```js
GameZone.init({
  canvas: document.getElementById('gameCanvas'),
  ctx: canvas.getContext('2d'),
  slug: '<game-slug>',           // MUST match the slug in the database
  onRestart: restartGame,        // your restart function
  container: document.getElementById('game-container'),
});
```

### 4.2 MUST call when the game ends (any reason):

```js
GameZone.gameOver(rawPoints, gameElapsedTimeInSeconds);
```

- `rawPoints` = the internal game metric (bubbles popped, candies matched, etc.)
- `gameElapsedTimeInSeconds` = active play time (excluding paused time)

This triggers the full pipeline:
1. SDK draws game-over screen with leaderboard
2. SDK sends `GAME_OVER` postMessage to parent page
3. Parent page calls `POST /api/scores` with `{ game, points, time, score }`
4. Backend saves/updates the score (best-score-only logic)
5. If game type is `rewarding` and `conversionRate > 0`:
   - Backend calls `autoCreditScore()` → upserts a wallet transaction
   - PKR amount = `score / conversionRate` (where score = points × timeBonus)
6. Parent page calls `fetchBalance()` to update navbar wallet display

**You do NOT need to call any wallet/transaction API from the game.** It all happens automatically via the SDK → postMessage → parent page → backend chain.

### 4.3 MUST check every frame in your render loop:

```js
function update(timestamp) {
  // ... game logic ...

  if (GameZone.isGameOver) {
    GameZone.drawGameOver();  // draws overlay on your canvas
    requestAnimationFrame(update);
    return;                   // skip all game rendering
  }

  // ... draw game ...
  requestAnimationFrame(update);
}
```

### 4.4 Score calculation (use this for display):

```js
const leaderboardScore = GameZone.calcScore(rawPoints, elapsedSeconds);
// Formula: points × (1 + max(0, 120 - time) / 600)
// Players who finish faster get a higher score.
```

### 4.5 Leaderboard panel:

```js
// Wire to your leaderboard button
lbBtn.addEventListener('click', () => GameZone.toggleLeaderboard());

// Auto-pause on mobile when leaderboard opens
GameZone.onLeaderboardOpen(() => { /* pause game */ });
GameZone.onLeaderboardClose(() => { /* resume game */ });
```

---

## 5. HUD API Reference (GameHUD)

The HUD is in `hud.js` and exposes a global `GameHUD` object. It auto-injects all hood HTML + CSS on load.

### 5.0 Add a game-specific stat to the hood (optional):

If your game needs a custom stat (lives, level, strength, etc.), inject it as the first hood element:

```js
// In script.js, BEFORE any getElementById calls for your custom elements:
GameHUD.addStat(`
    <div class="hood-btn" id="lives-btn">
        <span id="lives-icon">&#10084;</span>
        <span id="lives-count">3</span>
    </div>
`);
const livesCount = document.getElementById('lives-count');
```

`addStat(html)` inserts the element at the beginning of `#hood` and returns the DOM element.

### 5.1 Update PKR display — call every frame AND on every score event:

```js
GameHUD.updateScore(GameZone.calcScore(rawPoints, elapsedSeconds));
```

**CRITICAL**: Pass the calculated leaderboard score (with time bonus), NOT raw points.

### 5.2 Reset on game restart:

```js
GameHUD.reset();
```

### 5.3 Time limit (admin-configurable):

```js
// Check in your update loop:
if (GameHUD.hasTimeLimit) {
  const remaining = Math.max(0, GameHUD.timeLimitSeconds - gameElapsedTime);
  // Display countdown
  if (remaining <= 0) {
    // Trigger game over
    GameZone.gameOver(rawPoints, gameElapsedTime);
  }
} else {
  // Display count-up timer
}
```

The time limit values come from the database → parent page → postMessage `GAME_CONFIG` → `hud.js` automatically.

---

## 6. Timing Rules

### 6.1 Use `performance.now()` for elapsed time (NOT frame count):

```js
let gameStartTime = 0;
let totalPauseTime = 0;
let pauseStartTime = 0;
let gameElapsedTime = 0;

// On game start / restart:
gameStartTime = performance.now();
totalPauseTime = 0;
gameElapsedTime = 0;

// Every frame (when not paused):
gameElapsedTime = Math.round(
  (performance.now() - gameStartTime - totalPauseTime) / 1000
);
```

### 6.2 Track pause time separately:

```js
// On pause:
pauseStartTime = performance.now();

// On resume:
totalPauseTime += performance.now() - pauseStartTime;
```

### 6.3 Cap delta time to prevent frame spikes:

```js
const dt = Math.min((timestamp - lastTime) / 16.67, 3); // normalize to 60fps, cap at 3x
lastTime = timestamp;
```

---

## 7. Score vs Points — CRITICAL DISTINCTION

| Term | Meaning | Where used |
|---|---|---|
| `points` (or `rawPoints`) | Internal game metric: bubbles popped, candies matched, lines cleared, etc. | `#score` element, `GameZone.gameOver(points, ...)` first arg |
| `score` (leaderboard score) | `GameZone.calcScore(points, time)` = `points × timeBonus` | `#live-score` element, `GameHUD.updateScore()`, wallet PKR calculation, leaderboard ranking |

- The **leaderboard** ranks by `score`, not `points`.
- **PKR wallet credit** = `score / conversionRate`.
- **NEVER** pass raw `points` to `GameHUD.updateScore()`. Always use `GameZone.calcScore()`.
- **NEVER** calculate PKR from `points`. The backend already uses `score` from the POST body.

---

## 8. Canvas Responsive Scaling

### 8.1 Use a reference width and scale factor:

```js
const REF_WIDTH = 480;
let scaleFactor = canvas.width / REF_WIDTH;
function S(baseValue) { return baseValue * scaleFactor; }
```

All sizes (radii, speeds, fonts, gaps) should use `S()` so the game looks correct at any resolution.

### 8.2 Handle `window.resize`:

```js
window.addEventListener('resize', () => {
  resizeCanvas();
  scaleFactor = canvas.width / REF_WIDTH;
  // Rebuild all scaled values
  // Reinitialize game objects for new dimensions
  // Move player to new center if needed
});
```

### 8.3 Support both mobile and desktop:

```js
function isMobile() { return window.innerWidth <= 768; }
```

- Mobile: fill full viewport width, subtract hood height for canvas height
- Desktop: use portrait aspect ratio (e.g., 12:16), fit within viewport

---

## 9. Input Handling

Support ALL input methods:

```js
// Keyboard
window.addEventListener('keydown', (e) => { /* handle input */ });

// Mouse
canvas.addEventListener('mousedown', (e) => {
  const pos = getCanvasPos(e.clientX, e.clientY);
  // use pos.x, pos.y
});

// Touch (mobile)
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const pos = getCanvasPos(touch.clientX, touch.clientY);
  // use pos.x, pos.y
}, { passive: false });
```

### Canvas coordinate helper:

```js
function getCanvasPos(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height),
  };
}
```

---

## 10. Restart Function Requirements

Your `restartGame()` function MUST reset ALL state:

```js
function restartGame() {
  // 1. Reset score
  rawPoints = 0;
  scoreEl.textContent = '0';

  // 2. Reset timer
  gameStartTime = performance.now();
  totalPauseTime = 0;
  gameElapsedTime = 0;
  timeDisplay.textContent = '0:00';
  liveScoreEl.textContent = '0';

  // 3. Reset HUD
  GameHUD.reset();

  // 4. Reset game state
  gameOver = false;
  gamePaused = false;

  // 5. Recalculate scale
  scaleFactor = canvas.width / REF_WIDTH;

  // 6. Reinitialize game objects (board, pieces, projectiles, etc.)
  initGame();
}
```

---

## 11. Pause System

```js
let gamePaused = false;
const pauseBtn = document.getElementById('pause-btn');

function togglePause() {
  if (gameOver) return;
  if (gamePaused) {
    totalPauseTime += performance.now() - pauseStartTime;
    gamePaused = false;
    lastTime = 0;  // prevent dt spike on resume
    pauseBtn.innerHTML = '&#9208;'; // ⏸
  } else {
    gamePaused = true;
    pauseStartTime = performance.now();
    pauseBtn.innerHTML = '&#9654;'; // ▶
  }
}

pauseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  togglePause();
});

// In your update loop:
if (gamePaused) {
  requestAnimationFrame(update);
  return;  // skip all game logic
}
```

---

## 12. Audio

Use Web Audio API. Unlock AudioContext on first user gesture:

```js
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

canvas.addEventListener('mousedown', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });
canvas.addEventListener('touchstart', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });
```

---

## 13. Game Over Triggers

Your game can end from multiple conditions. ALL paths MUST call the same sequence:

```js
gameOver = true;
playGameOverSound();  // your sound
GameZone.gameOver(rawPoints, gameElapsedTime);  // SDK handles the rest
```

Common triggers:
- **Time expired** (time-limited game): `remaining <= 0`
- **No more moves** (puzzle game): board state check
- **Health/lives depleted**: lives === 0
- **Board cleared** / win condition

---

## 14. Backend API Flow (for reference — you do NOT call these from the game)

When `GameZone.gameOver()` fires, the SDK sends a `GAME_OVER` postMessage to the parent Next.js page. The parent page then:

### 14.1 Save score:
```
POST /api/scores
Body: { game: "<slug>", points: <int>, time: <int seconds>, score: <float> }
Auth: Bearer token (handled by authFetch)
```

Backend logic:
- Finds existing score for this user + game (+ contestId for competitive)
- If no existing score → creates new record
- If new score > existing → updates record (best-score-only)
- If new score <= existing → increments `totalPlays` only
- Returns `{ ...score, rank, isNewBest }`

### 14.2 Auto wallet credit (rewarding games only):
Triggered automatically inside `saveScore` when `isNewBest === true`:
```
autoCreditScore(userId, gameSlug, gameName, totalPkr)
```

- `totalPkr = score / conversionRate`
- Uses upsert pattern: ONE transaction per user per game
- On first play: creates `{ type: 'credit', description: 'Best score reward', game: gameName }`
- On better score: updates existing transaction, credits only the delta to wallet
- `conversionRate` semantics: "X score per 1 PKR" (e.g., rate=10 means 10 score = 1 PKR)

### 14.3 Fetch updated balance:
```
GET /api/wallet/balance
Auth: Bearer token
Response: { balance: <float> }
```

Called after score save to refresh the navbar.

### 14.4 Fetch leaderboard:
```
GET /api/scores/leaderboard/<slug>?limit=10
Response: [{ name, points, time, score }, ...]
```

Called on game load and after each game over.

---

## 15. Database Registration (Admin Panel)

Before deploying a new game, register it in the admin panel (`/dashboard/games`):

| Field | Description | Example |
|---|---|---|
| `name` | Display name | "Candy Crush" |
| `slug` | URL-safe identifier. **MUST match** `GameZone.init({ slug })` and the folder name | "candy-crush" |
| `gamePath` | Folder name in `public/games/` | "candy-crush" |
| `gameType` | `"rewarding"` (wallet credits) or `"competitive"` (prize pool) | "rewarding" |
| `conversionRate` | Score-to-PKR ratio. `0` = no PKR. `10` = 10 score per 1 PKR | 10 |
| `showCurrency` | Show PKR in game HUD | true/false |
| `hasTimeLimit` | Enable countdown timer | true/false |
| `timeLimitSeconds` | Duration in seconds (only if hasTimeLimit is true) | 600 |
| `isLive` | Show to players | true/false |
| `instructions` | Array of `{ icon, title, text }` shown on game start screen | — |

---

## 16. Next.js Game Page

Each game needs a Next.js page at `frontend/src/app/games/<slug>/page.jsx`. This page:
- Fetches the game config from `GET /api/games/<slug>`
- Renders the game iframe: `<iframe src="/games/<gamePath>/index.html">`
- Listens for postMessage events (`REQUEST_LEADERBOARD`, `REQUEST_GAME_CONFIG`, `GAME_OVER`)
- Sends `GAME_CONFIG` (conversionRate, showCurrency, hasTimeLimit, timeLimitSeconds) to iframe
- Sends `LEADERBOARD_DATA` to iframe
- On `GAME_OVER`: calls `POST /api/scores`, then `sendLeaderboardToIframe()`, then `fetchBalance()`

You can copy `frontend/src/app/games/bubble-shooter/page.jsx` as a template. Change only the `SLUG` constant at the top.

---

## 17. CSS — What hud.js Provides vs What You Add

`hud.js` auto-injects ALL shared CSS: page reset (`*`, `body`), layout (`#game-container`, `#game-wrapper`, `canvas`), and the full hood bar styling (`.hood-btn`, `.hood-btn-split`, `.hood-btn-top`, `.hood-btn-value`, `#hood`, etc.).

The hood uses a `--s` CSS custom property for scaling. Set it in your resize function:

```js
container.style.setProperty('--s', Math.min(canvas.width / 400, 1));
```

**You only need a `style.css` for game-specific elements** (e.g., a custom stat button you added via `GameHUD.addStat()`). hud.js styles are injected before your `<link>` stylesheet, so your CSS can override any default.

Example game-specific `style.css` (only custom stat styling):
```css
#lives-btn { justify-content: center; gap: calc(4px * var(--s, 1)); }
#lives-icon { font-size: calc(14px * var(--s, 1)); color: #ff6b6b; }
#lives-count { font-size: calc(13px * var(--s, 1)); font-weight: 800; color: #fff; }
```

If your game has NO custom stats, you don't need a `style.css` at all.

---

## 18. Common Mistakes to Avoid

1. **Using `points` instead of `score` for PKR** — PKR is `score / conversionRate`, never `points / conversionRate`
2. **Calling wallet APIs from the game script** — all wallet logic is handled by the parent page + backend automatically
3. **Forgetting to call `GameHUD.updateScore()` every frame** — PKR display goes stale if only called on score events
4. **Not capping `dt`** — tab switches cause huge delta → objects teleport
5. **Not tracking pause time** — time bonus becomes wrong after pausing
6. **Using `setInterval` for game loops** — use `requestAnimationFrame` exclusively
7. **Hardcoded sizes** — always use `S()` helper so game works on all screen sizes
8. **Missing `e.preventDefault()` on touch events** — causes scroll/zoom on mobile
9. **Loading SDK before hud.js** — `GameHUD` must exist before SDK initializes
10. **Mismatched slug** — if `GameZone.init({ slug: 'candy-crush' })` doesn't match the DB record's slug, scores won't save and leaderboard won't load
11. **Adding `#hood` HTML manually** — `hud.js` injects the hood automatically. Do NOT add hood HTML in index.html
12. **Calling getElementById before addStat** — if you use `GameHUD.addStat()` for a custom stat, call it BEFORE `getElementById` for those custom elements

---

## 19. Checklist Before Shipping a New Game

- [ ] `slug` in `GameZone.init()` matches database slug matches folder name
- [ ] `hud.js` copied verbatim from `bubble-shooter/hud.js`
- [ ] Scripts load in correct order: `hud.js` → `gamezone-sdk.js` → `script.js`
- [ ] `index.html` has ONLY `#game-container > #game-wrapper > canvas` (no `#hood` HTML)
- [ ] Hood auto-injected by hud.js — elements `#score`, `#time-display`, `#live-score`, `#pause-btn`, `#lb-btn` exist after hud.js loads
- [ ] Custom stats (if any) added via `GameHUD.addStat()` BEFORE `getElementById`
- [ ] `GameZone.gameOver(points, time)` called on EVERY game-end path
- [ ] `GameHUD.updateScore(GameZone.calcScore(...))` called every frame + on score events
- [ ] `GameHUD.reset()` called in restart function
- [ ] Countdown timer works when `GameHUD.hasTimeLimit` is true
- [ ] Count-up timer works when `hasTimeLimit` is false
- [ ] Pause correctly tracks `totalPauseTime` and resumes without dt spike
- [ ] `GameZone.isGameOver` checked every frame, `drawGameOver()` called when true
- [ ] Leaderboard open/close callbacks pause/resume the game on mobile
- [ ] Touch + mouse + keyboard input all work
- [ ] Canvas scales properly on resize (mobile + desktop)
- [ ] All sizes use `S()` scale helper based on `REF_WIDTH`
- [ ] AudioContext unlocked on first user interaction
- [ ] Game registered in admin panel with correct slug, gamePath, type, and rates
- [ ] Next.js page exists at `src/app/games/<slug>/page.jsx` (copy from bubble-shooter, change SLUG)
