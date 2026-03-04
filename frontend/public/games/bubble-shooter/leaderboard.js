// ── Leaderboard Module ──
// Now powered by backend API via postMessage to parent (Next.js)
// Falls back to local data if no API data received

const Leaderboard = (() => {
    const MAX_ENTRIES = 10;

    // Fallback data shown until real API data arrives
    const defaultEntries = [
        { name: 'Ace',     points: 48, time: 35,  score: 55 },
        { name: 'Blaze',   points: 45, time: 45,  score: 51 },
        { name: 'Comet',   points: 42, time: 55,  score: 47 },
        { name: 'Dash',    points: 40, time: 65,  score: 44 },
        { name: 'Echo',    points: 38, time: 75,  score: 41 },
        { name: 'Flare',   points: 35, time: 85,  score: 37 },
        { name: 'Glow',    points: 32, time: 95,  score: 33 },
        { name: 'Haze',    points: 28, time: 110, score: 29 },
        { name: 'Ion',     points: 24, time: 120, score: 24 },
        { name: 'Jinx',    points: 20, time: 140, score: 20 },
    ];

    // In-memory entries (updated from API via parent postMessage)
    let entries = [...defaultEntries];
    let apiLoaded = false;

    function calcScore(points, timeSec) {
        if (points <= 0) return 0;
        if (timeSec <= 0) timeSec = 1;
        const timeBonus = 1 + Math.max(0, 120 - timeSec) / 600;
        return parseFloat((points * timeBonus).toFixed(2));
    }

    function getAll() {
        return entries.slice(0, MAX_ENTRIES);
    }

    // Called by parent postMessage with fresh API data
    function setEntries(apiEntries) {
        if (Array.isArray(apiEntries) && apiEntries.length > 0) {
            entries = apiEntries.slice(0, MAX_ENTRIES);
            apiLoaded = true;
        }
    }

    // Add player's entry locally (for immediate display on game over canvas)
    // Real persistence happens via parent postMessage → API
    function addEntry(name, points, timeSec) {
        const sc = calcScore(points, timeSec);
        const newEntry = { name, points, time: Math.round(timeSec), score: sc };

        // Merge into current entries
        const merged = [...entries.filter(e => e.name !== name || e.isPlayer !== true), { ...newEntry, isPlayer: true }];
        merged.sort((a, b) => b.score - a.score);
        const top = merged.slice(0, MAX_ENTRIES);
        entries = top;

        const rank = top.findIndex(e => e.isPlayer && e.score === sc) + 1;
        return { entries: top, score: sc, rank: rank || top.length + 1 };
    }

    // Update entries after API responds (called after score is saved)
    function updateFromAPI(apiEntries, playerScore) {
        if (!Array.isArray(apiEntries)) return;
        entries = apiEntries.slice(0, MAX_ENTRIES);
        apiLoaded = true;
    }

    function getRank(scoreVal) {
        for (let i = 0; i < entries.length; i++) {
            if (scoreVal >= entries[i].score) return i + 1;
        }
        return entries.length + 1;
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }

    // Ask parent for leaderboard data on load
    function requestData() {
        try {
            window.parent.postMessage({ type: 'REQUEST_LEADERBOARD', game: 'bubble-shooter' }, '*');
        } catch (e) {}
    }

    // ── Panel DOM ──
    let panel = null;
    let isOpen = false;
    let onOpenCb = null;
    let onCloseCb = null;

    function createPanel() {
        if (panel) return;

        panel = document.createElement('div');
        panel.id = 'lb-panel';
        panel.innerHTML = `
            <div id="lb-header">
                <span id="lb-title">🏆 Leaderboard</span>
                <button id="lb-close">&times;</button>
            </div>
            <div id="lb-table-wrap">
                <table id="lb-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Pts</th>
                            <th>Time</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody id="lb-body"></tbody>
                </table>
            </div>
        `;
        document.getElementById('game-container').appendChild(panel);

        document.getElementById('lb-close').addEventListener('click', () => close());
    }

    function renderRows() {
        const tbody = document.getElementById('lb-body');
        const data = getAll();
        tbody.innerHTML = '';
        data.forEach((e, i) => {
            const tr = document.createElement('tr');
            if (i === 0) tr.classList.add('lb-gold');
            else if (i === 1) tr.classList.add('lb-silver');
            else if (i === 2) tr.classList.add('lb-bronze');
            if (e.isPlayer) tr.classList.add('lb-you');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${e.name}${e.isPlayer ? ' (you)' : ''}</td>
                <td>${e.points}</td>
                <td>${formatTime(e.time)}</td>
                <td class="lb-score">${e.score}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function open() {
        requestData(); // refresh from API
        createPanel();
        renderRows();
        panel.classList.add('lb-open');
        isOpen = true;
        if (onOpenCb) onOpenCb();
    }

    function close() {
        if (panel) panel.classList.remove('lb-open');
        isOpen = false;
        if (onCloseCb) onCloseCb();
    }

    function toggle() {
        isOpen ? close() : open();
    }

    function onOpen(cb) { onOpenCb = cb; }
    function onClose(cb) { onCloseCb = cb; }

    // Request data on init
    requestData();

    return {
        calcScore, getAll, addEntry, getRank, formatTime,
        open, close, toggle, onOpen, onClose,
        setEntries, updateFromAPI, requestData, renderRows,
        get isOpen() { return isOpen; },
        get apiLoaded() { return apiLoaded; }
    };
})();
