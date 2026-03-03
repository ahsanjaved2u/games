// ── Leaderboard Module ──
// Score formula: score = points * (300 / timeSpent)
// Less time + more points = higher score

const Leaderboard = (() => {
    const STORAGE_KEY = 'bubble_shooter_leaderboard';
    const MAX_ENTRIES = 10;

    // Sample data (will be replaced by real data over time)
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

    function calcScore(points, timeSec) {
        if (points <= 0) return 0;
        if (timeSec <= 0) timeSec = 1;
        // Time bonus: up to 20% extra for finishing fast, fading over 120 seconds
        const timeBonus = 1 + Math.max(0, 120 - timeSec) / 600;
        return parseFloat((points * timeBonus).toFixed(2));
    }

    function load() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (Array.isArray(data) && data.length > 0) return data.slice(0, MAX_ENTRIES);
        } catch (e) {}
        return [...defaultEntries];
    }

    function save(entries) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    }

    function getAll() {
        return load();
    }

    function addEntry(name, points, timeSec) {
        const sc = calcScore(points, timeSec);
        const entries = load();
        entries.push({ name, points, time: Math.round(timeSec), score: sc });
        entries.sort((a, b) => b.score - a.score);
        const top = entries.slice(0, MAX_ENTRIES);
        save(top);
        // Find rank (1-based) of the newly added entry
        const rank = top.findIndex(e => e.score === sc && e.name === name) + 1;
        return { entries: top, score: sc, rank };
    }

    function getRank(scoreVal) {
        const entries = load();
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
        const entries = load();
        tbody.innerHTML = '';
        entries.forEach((e, i) => {
            const tr = document.createElement('tr');
            if (i === 0) tr.classList.add('lb-gold');
            else if (i === 1) tr.classList.add('lb-silver');
            else if (i === 2) tr.classList.add('lb-bronze');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${e.name}</td>
                <td>${e.points}</td>
                <td>${formatTime(e.time)}</td>
                <td class="lb-score">${e.score}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function open() {
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

    return { calcScore, getAll, addEntry, getRank, formatTime, open, close, toggle, onOpen, onClose, get isOpen() { return isOpen; } };
})();
