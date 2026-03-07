// ══════════════════════════════════════════════════════════════
//  GameZone HUD — currency display for game HUDs
//
//  Listens for GAME_CONFIG from parent page.
//  If showCurrency is true and conversionRate > 0,
//  shows #pkr-btn and updates #pkr-amount on score change.
//
//  HTML must have:
//    <div id="pkr-btn" style="display:none;"> ... <span id="pkr-amount">0</span> ... </div>
//
//  Usage:
//    GameHUD.updateScore(points);
//    GameHUD.reset();
// ══════════════════════════════════════════════════════════════

const GameHUD = (() => {
    let conversionRate = 0;
    let showCurrency = false;

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
            applyVisibility();
        }
    });

    // Request config from parent
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'REQUEST_GAME_CONFIG' }, '*');
    }

    return { updateScore, reset };
})();
