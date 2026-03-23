// ══════════════════════════════════════════════════════════════
//  GameZone HUD — self-contained hood bar for all games
//
//  Drop this file into any game folder. It automatically:
//    1. Injects all hood CSS (page reset, layout, hood styles)
//    2. Injects the hood HTML into #game-container
//    3. Listens for GAME_CONFIG from parent (PKR, time limit)
//    4. Provides GameHUD.addStat(html) for game-specific stats
//
//  Required HTML:
//    <div id="game-container">
//      <div id="game-wrapper"><canvas id="gameCanvas"></canvas></div>
//    </div>
//    <script src="hud.js"></script>
//
//  Usage:
//    GameHUD.addStat('<div class="hood-btn" id="lives">...</div>');
//    GameHUD.updateScore(score);
//    GameHUD.reset();
// ══════════════════════════════════════════════════════════════

const GameHUD = (() => {
    // ── Config ──
    let conversionRate = 0;
    let showCurrency = false;
    let _hasTimeLimit = false;
    let _timeLimitSeconds = 0;

    // ══════════════════════════════════════════
    //  CSS Injection
    // ══════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('gz-hud-styles')) return;
        const style = document.createElement('style');
        style.id = 'gz-hud-styles';
        style.textContent = `
/* ── Reset & Body ── */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    margin: 0; overflow: hidden;
    background-color: #0b0b1a; color: #fff;
    font-family: 'Arial', sans-serif;
    display: flex; justify-content: center; align-items: flex-start;
    height: 100dvh; height: 100vh; width: 100vw; padding: 0;
}

/* ── Layout ── */
#game-container {
    display: flex; flex-direction: column;
    align-items: stretch; position: relative;
}
#game-wrapper {
    position: relative;
    border: 2px solid rgba(0, 255, 255, 0.3);
    border-top: none;
    border-radius: 0 0 12px 12px;
    overflow: hidden;
    box-shadow: 0 0 30px rgba(0,255,255,0.15), 0 0 60px rgba(128,0,255,0.1);
}
canvas {
    display: block;
    background: #030310;
    border-radius: 0 0 10px 10px;
}

/* ── Hood (top bar) ── */
#hood {
    display: flex; align-items: center;
    gap: calc(6px * var(--s, 1));
    height: calc(48px * var(--s, 1));
    background: linear-gradient(180deg, #161632 0%, #0d0d22 100%);
    border: 2px solid rgba(0, 255, 255, 0.25);
    border-bottom: 1px solid rgba(0, 255, 255, 0.12);
    border-radius: calc(12px * var(--s, 1)) calc(12px * var(--s, 1)) 0 0;
    padding: 0 calc(8px * var(--s, 1));
    box-shadow: 0 -4px 20px rgba(0,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05);
}

/* ── Shared pill-button ── */
.hood-btn {
    flex: 1; min-width: 0;
    display: flex; align-items: center;
    gap: calc(4px * var(--s, 1));
    height: calc(32px * var(--s, 1));
    padding: 0 calc(8px * var(--s, 1));
    border-radius: calc(8px * var(--s, 1));
    background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.3);
}
#score-btn { justify-content: center; }
.hood-btn-split {
    flex-direction: column; justify-content: center; gap: 0px;
    padding: calc(2px * var(--s, 1)) calc(8px * var(--s, 1));
}
.hood-btn-top {
    display: flex; align-items: center; justify-content: center;
    gap: calc(3px * var(--s, 1)); width: 100%;
}
.hood-btn-top span {
    font-size: calc(9px * var(--s, 1)); font-weight: 600;
    color: #888; letter-spacing: calc(1px * var(--s, 1));
    text-transform: uppercase; line-height: 1;
}
.hood-btn-value {
    font-size: calc(13px * var(--s, 1)); font-weight: 800;
    color: #fff; text-align: center;
    letter-spacing: calc(1px * var(--s, 1)); line-height: 1;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

/* ── Element styles ── */
#time-icon {
    font-size: calc(14px * var(--s, 1)); color: #00e5ff; flex-shrink: 0;
    filter: drop-shadow(0 0 3px rgba(0,229,255,0.5));
}
#time-text {
    font-size: calc(12px * var(--s, 1)); font-weight: 600;
    color: #999; letter-spacing: calc(1px * var(--s, 1));
}
#time-display {
    font-size: calc(14px * var(--s, 1)); font-weight: 800;
    color: #fff; letter-spacing: calc(1px * var(--s, 1));
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}
#live-score-icon {
    font-size: calc(12px * var(--s, 1)); color: #ff6b6b;
    filter: drop-shadow(0 0 3px rgba(255,107,107,0.5));
}
#score-icon {
    font-size: calc(12px * var(--s, 1)); color: #ffd93d;
    filter: drop-shadow(0 0 3px rgba(255,217,61,0.5));
}
#score-text { font-size: calc(10px * var(--s, 1)); }
#lb-btn, #pause-btn {
    flex: 0 0 calc(32px * var(--s, 1)); width: calc(32px * var(--s, 1));
    justify-content: center; padding: 0;
    font-size: calc(16px * var(--s, 1)); cursor: pointer; color: #fff;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
#lb-btn:hover, #pause-btn:hover {
    transform: scale(1.1);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 0 12px rgba(255,217,61,0.3);
}
#lb-btn:active, #pause-btn:active { transform: scale(0.95); }
        `;
        // Insert before game stylesheet so game CSS can override
        const firstLink = document.querySelector('link[rel="stylesheet"]');
        if (firstLink) {
            document.head.insertBefore(style, firstLink);
        } else {
            document.head.appendChild(style);
        }
    }

    // ══════════════════════════════════════════
    //  HTML Injection
    // ══════════════════════════════════════════

    function injectHood() {
        const container = document.getElementById('game-container');
        if (!container || document.getElementById('hood')) return;

        const hood = document.createElement('div');
        hood.id = 'hood';
        hood.innerHTML = `
            <div class="hood-btn hood-btn-split" id="score-btn">
                <div class="hood-btn-top">
                    <span id="score-icon">&#9733;</span>
                    <span id="score-text">Points</span>
                </div>
                <span id="score" class="hood-btn-value">0</span>
            </div>
            <div class="hood-btn" id="time-btn">
                <span id="time-icon">&#9201;</span>
                <span id="time-display">0:00</span>
            </div>
            <div class="hood-btn hood-btn-split" id="live-score-btn">
                <div class="hood-btn-top">
                    <span id="live-score-icon">&#9878;</span>
                    <span class="hood-btn-label">Score</span>
                </div>
                <span id="live-score" class="hood-btn-value">0</span>
            </div>
            <div class="hood-btn hood-btn-split" id="pkr-btn" style="display:none;">
                <div class="hood-btn-top">
                    <span style="font-size:calc(11px * var(--s,1)); filter:drop-shadow(0 0 3px rgba(255,217,61,0.5))">&#x20A8;</span>
                    <span style="color:#ffd93d">PKR</span>
                </div>
                <span id="pkr-amount" class="hood-btn-value" style="color:#ffd93d; text-shadow:0 0 8px rgba(255,217,61,0.5)">0</span>
            </div>
            <button class="hood-btn" id="pause-btn" title="Pause">&#9208;</button>
            <button class="hood-btn" id="lb-btn" title="Leaderboard">&#127942;</button>
        `;
        container.insertBefore(hood, container.firstChild);
    }

    // ══════════════════════════════════════════
    //  Custom stat slot
    // ══════════════════════════════════════════

    function addStat(html) {
        const hood = document.getElementById('hood');
        if (!hood) return null;
        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        const el = temp.firstElementChild;
        if (el) hood.insertBefore(el, hood.firstChild);
        return el;
    }

    // ══════════════════════════════════════════
    //  PKR / Config logic
    // ══════════════════════════════════════════

    const getPkrBtn = () => document.getElementById('pkr-btn');
    const getPkrAmount = () => document.getElementById('pkr-amount');

    function applyVisibility() {
        const btn = getPkrBtn();
        if (!btn) return;
        btn.style.display = (showCurrency && conversionRate > 0) ? '' : 'none';
    }

    function updateScore(points) {
        if (!showCurrency || conversionRate <= 0) return;
        const el = getPkrAmount();
        if (!el) return;
        const pkr = points / conversionRate;
        el.textContent = pkr % 1 === 0 ? pkr.toFixed(0) : pkr.toFixed(2);
    }

    function reset() {
        const el = getPkrAmount();
        if (el) el.textContent = '0';
    }

    window.addEventListener('message', (e) => {
        if (e.data?.type === 'GAME_CONFIG') {
            conversionRate = Number(e.data.conversionRate) || 0;
            showCurrency = !!e.data.showCurrency;
            _hasTimeLimit = !!e.data.hasTimeLimit;
            _timeLimitSeconds = Number(e.data.timeLimitSeconds) || 0;
            applyVisibility();
        }
    });

    // Request config from parent
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'REQUEST_GAME_CONFIG' }, '*');
    }

    // ── Initialize immediately ──
    injectStyles();
    injectHood();

    return {
        addStat,
        updateScore,
        reset,
        get hasTimeLimit() { return _hasTimeLimit && _timeLimitSeconds > 0; },
        get timeLimitSeconds() { return _timeLimitSeconds; },
    };
})();
