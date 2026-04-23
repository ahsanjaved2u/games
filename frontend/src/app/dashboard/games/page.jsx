'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminRoute from '@/components/AdminRoute';
import Link from 'next/link';

/* ── Icons ── */
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const GamepadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" />
    <rect x="2" y="6" width="20" height="12" rx="2" />
  </svg>
);
const TrophyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const Field = ({ label, children, half, full }) => (
  <div style={{ flex: full ? '1 1 100%' : half ? '1 1 45%' : '1 1 100%', minWidth: half ? 200 : 'auto' }}>
    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
    {children}
  </div>
);

const SectionHeader = ({ icon, title, subtitle }) => (
  <div style={{ flex: '1 1 100%', marginTop: 8, marginBottom: 2 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</span>
    </div>
    {subtitle && <p className="text-[10px]" style={{ color: 'var(--text-muted)', marginLeft: 23 }}>{subtitle}</p>}
    <div style={{ height: 1, background: 'var(--subtle-border)', marginTop: 8 }} />
  </div>
);

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  fontSize: 14, color: '#fff',
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  outline: 'none', transition: 'border-color 0.2s',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 36,
};

const emptyForm = {
  name: '', slug: '', description: '', thumbnail: 'thumbnail.webp',
  gamePath: '',
};

const emptyContestForm = {
  name: '', tag: '', startDate: '', endDate: '', entryFee: 0, prizes: [],
  minPlayersThreshold: 0, hasTimeLimit: false, timeLimitSeconds: 0,
  color: '#00e5ff', instructions: [],
};

const emptySessionForm = {
  name: '', tag: '', durationDays: 0, durationHours: 0, durationMinutes: 0,
  conversionRate: 0, showCurrency: false, entryFee: 0, attemptCost: 0,
  hasTimeLimit: false, timeLimitSeconds: 0, color: '#00e5ff', instructions: [],
};

function GamesManagement() {
  const { authFetch } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadTargetId, setUploadTargetId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', body: '', onConfirm: null });
  const fileRef = useRef(null);

  // ── Panel state: contest or session management ──
  const [panelGameId, setPanelGameId] = useState(null);  // which game
  const [panelType, setPanelType] = useState(null);       // 'contest' or 'session'
  const [panelItems, setPanelItems] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [showPanelForm, setShowPanelForm] = useState(false);
  const [editingPanelId, setEditingPanelId] = useState(null);
  const [contestForm, setContestForm] = useState({ ...emptyContestForm });
  const [sessionForm, setSessionForm] = useState({ ...emptySessionForm });
  const [savingPanel, setSavingPanel] = useState(false);

  // ── Dropdown state ──
  const [dropdownOpen, setDropdownOpen] = useState(null); // gameId or null

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const showConfirm = (title, body, onConfirm) => setConfirmModal({ open: true, title, body, onConfirm });
  const closeConfirm = () => setConfirmModal({ open: false, title: '', body: '', onConfirm: null });

  const fetchGames = async () => {
    setLoading(true);
    try {
      const data = await authFetch('/games/admin/all');
      setGames(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchGames(); }, []);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleNameChange = (val) => {
    setForm(f => ({
      ...f,
      name: val,
      slug: editingId ? f.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      gamePath: editingId ? f.gamePath : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  /* Prize helpers */
  const addPrize = () => setContestForm(f => ({ ...f, prizes: [...f.prizes, 0] }));
  const removePrize = (idx) => setContestForm(f => ({ ...f, prizes: f.prizes.filter((_, i) => i !== idx) }));
  const updatePrize = (idx, val) => setContestForm(f => {
    const copy = [...f.prizes];
    copy[idx] = val === '' ? 0 : Number(val);
    return { ...f, prizes: copy };
  });

  /* Instructions helpers for contest form */
  const addContestInstruction = () => setContestForm(f => ({ ...f, instructions: [...f.instructions, { icon: '\uD83C\uDFAE', title: '', text: '' }] }));
  const removeContestInstruction = (idx) => setContestForm(f => ({ ...f, instructions: f.instructions.filter((_, i) => i !== idx) }));
  const updateContestInstruction = (idx, field, val) => setContestForm(f => {
    const copy = [...f.instructions]; copy[idx] = { ...copy[idx], [field]: val }; return { ...f, instructions: copy };
  });

  /* Instructions helpers for session form */
  const addSessionInstruction = () => setSessionForm(f => ({ ...f, instructions: [...f.instructions, { icon: '\uD83C\uDFAE', title: '', text: '' }] }));
  const removeSessionInstruction = (idx) => setSessionForm(f => ({ ...f, instructions: f.instructions.filter((_, i) => i !== idx) }));
  const updateSessionInstruction = (idx, field, val) => setSessionForm(f => {
    const copy = [...f.instructions]; copy[idx] = { ...copy[idx], [field]: val }; return { ...f, instructions: copy };
  });

  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d - offset).toISOString().slice(0, 16);
  };

  /* Submit create / update game (simplified) */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editingId) {
        await authFetch(`/games/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        flash('Game updated');
      } else {
        await authFetch('/games', { method: 'POST', body: JSON.stringify(payload) });
        flash('Game created');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      fetchGames();
    } catch (err) {
      flash(err.message || 'Save failed', 'error');
    }
    setSaving(false);
  };

  const startEdit = (game) => {
    setForm({
      name: game.name || '', slug: game.slug || '',
      description: game.description || '', thumbnail: game.thumbnail || '',
      gamePath: game.gamePath || '',
    });
    setEditingId(game._id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    showConfirm('Delete Game?', 'This will permanently remove the game and all its data.', async () => {
      try {
        await authFetch(`/games/${id}`, { method: 'DELETE' });
        flash('Game deleted'); fetchGames();
      } catch (err) { flash(err.message || 'Delete failed', 'error'); }
    });
  };

  const handleToggle = async (id) => {
    try {
      const data = await authFetch(`/games/${id}/toggle-live`, { method: 'PATCH' });
      setGames(prev => prev.map(g => g._id === id ? { ...g, isLive: data.isLive } : g));
    } catch (err) { flash(err.message || 'Toggle failed', 'error'); }
  };

  const handleUpload = async (gameId) => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploadingId(gameId);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('gz_token');
      const fd = new FormData();
      fd.append('gameZip', file);
      const res = await fetch(`${API}/games/${gameId}/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      flash('Files uploaded & extracted');
    } catch (err) { flash(err.message || 'Upload failed', 'error'); }
    setUploadingId(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── Panel: Contest / Session management ── */
  const openPanel = async (game, type) => {
    setPanelGameId(game._id);
    setPanelType(type);
    setShowPanelForm(false);
    setEditingPanelId(null);
    setDropdownOpen(null);
    setPanelLoading(true);
    try {
      const url = type === 'contest' ? `/contests/game/${game._id}` : `/sessions/game/${game._id}`;
      const data = await authFetch(url);
      setPanelItems(Array.isArray(data) ? data : []);
    } catch { setPanelItems([]); }
    setPanelLoading(false);
  };

  const closePanel = () => {
    setPanelGameId(null); setPanelType(null); setPanelItems([]);
    setShowPanelForm(false); setEditingPanelId(null);
  };

  /* Contest CRUD */
  const startEditContest = (c) => {
    setContestForm({
      name: c.name || '', tag: c.tag || '', startDate: toLocalInput(c.startDate), endDate: toLocalInput(c.endDate),
      entryFee: c.entryFee || 0, prizes: c.prizes || [],
      minPlayersThreshold: c.minPlayersThreshold || 0,
      hasTimeLimit: c.hasTimeLimit || false, timeLimitSeconds: c.timeLimitSeconds || 0,
      color: c.color || '#00e5ff', instructions: c.instructions || [],
    });
    setEditingPanelId(c._id);
    setShowPanelForm(true);
  };

  const handleContestSubmit = async (e) => {
    e.preventDefault();
    setSavingPanel(true);
    try {
      const payload = { ...contestForm };
      if (payload.startDate) payload.startDate = new Date(payload.startDate).toISOString();
      if (payload.endDate) payload.endDate = new Date(payload.endDate).toISOString();
      if (editingPanelId) {
        await authFetch(`/contests/${editingPanelId}`, { method: 'PUT', body: JSON.stringify(payload) });
        flash('Contest updated');
      } else {
        payload.gameId = panelGameId;
        await authFetch('/contests', { method: 'POST', body: JSON.stringify(payload) });
        flash('Contest created');
      }
      setShowPanelForm(false); setEditingPanelId(null);
      setContestForm({ ...emptyContestForm });
      const data = await authFetch(`/contests/game/${panelGameId}`);
      setPanelItems(Array.isArray(data) ? data : []);
      fetchGames();
    } catch (err) { flash(err.message || 'Contest save failed', 'error'); }
    setSavingPanel(false);
  };

  const handleCancelContest = (contestId) => {
    showConfirm('End Contest?', 'This will end the contest and distribute prizes. Cannot be undone.', async () => {
      try {
        await authFetch(`/contests/${contestId}/cancel`, { method: 'PATCH' });
        flash('Contest ended');
        const data = await authFetch(`/contests/game/${panelGameId}`);
        setPanelItems(Array.isArray(data) ? data : []);
        fetchGames();
      } catch (err) { flash(err.message || 'End failed', 'error'); }
    });
  };

  /* Session CRUD */
  const startEditSession = (s) => {
    setSessionForm({
      name: s.name || '', tag: s.tag || '',
      durationDays: s.durationDays || 0, durationHours: s.durationHours || 0, durationMinutes: s.durationMinutes || 0,
      conversionRate: s.conversionRate || 0, showCurrency: s.showCurrency || false,
      entryFee: s.entryFee || 0, attemptCost: s.attemptCost || 0,
      hasTimeLimit: s.hasTimeLimit || false, timeLimitSeconds: s.timeLimitSeconds || 0,
      color: s.color || '#00e5ff', instructions: s.instructions || [],
    });
    setEditingPanelId(s._id);
    setShowPanelForm(true);
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    setSavingPanel(true);
    try {
      const payload = { ...sessionForm };
      if (editingPanelId) {
        await authFetch(`/sessions/${editingPanelId}`, { method: 'PUT', body: JSON.stringify(payload) });
        flash('Session updated');
      } else {
        payload.gameId = panelGameId;
        await authFetch('/sessions', { method: 'POST', body: JSON.stringify(payload) });
        flash('Session created');
      }
      setShowPanelForm(false); setEditingPanelId(null);
      setSessionForm({ ...emptySessionForm });
      const data = await authFetch(`/sessions/game/${panelGameId}`);
      setPanelItems(Array.isArray(data) ? data : []);
      fetchGames();
    } catch (err) { flash(err.message || 'Session save failed', 'error'); }
    setSavingPanel(false);
  };

  const handleDeleteSession = (sessionId) => {
    showConfirm('Delete Session?', 'This will delete this session configuration.', async () => {
      try {
        await authFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
        flash('Session deleted');
        const data = await authFetch(`/sessions/game/${panelGameId}`);
        setPanelItems(Array.isArray(data) ? data : []);
        fetchGames();
      } catch (err) { flash(err.message || 'Delete failed', 'error'); }
    });
  };

  const toggleSessionActive = async (sessionId, session) => {
    try {
      // Toggle pause: true → false, false → true
      await authFetch(`/sessions/${sessionId}`, { method: 'PUT', body: JSON.stringify({ pause: !session.pause }) });
      const data = await authFetch(`/sessions/game/${panelGameId}`);
      setPanelItems(Array.isArray(data) ? data : []);
      fetchGames();
    } catch (err) { flash(err.message || 'Toggle failed', 'error'); }
  };

  /* ── Derived badges for game card ── */
  const getGameBadges = (game) => {
    const badges = [];
    const hasContests = game.contests?.length > 0;
    const hasSessions = game.sessions?.length > 0;
    if (hasContests) badges.push({ label: 'COMPETITIVE', color: 'var(--neon-yellow)', bg: 'rgba(255,217,61,0.1)', border: 'rgba(255,217,61,0.2)' });
    if (hasSessions) badges.push({ label: 'REWARDING', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' });
    if (!hasContests && !hasSessions) badges.push({ label: 'NO CONFIG', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' });
    // Live contests status
    const liveContest = game.contests?.find(c => c.status === 'live');
    if (liveContest) badges.push({ label: `CONTEST LIVE`, color: 'var(--neon-green)', bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.2)' });
    // Active sessions count
    const activeSessions = game.sessions?.filter(s => s.isActive) || [];
    if (activeSessions.length > 0) badges.push({ label: `${activeSessions.length} SESSION${activeSessions.length > 1 ? 'S' : ''} ACTIVE`, color: 'var(--neon-cyan)', bg: 'rgba(0,229,255,0.1)', border: 'rgba(0,229,255,0.2)' });
    return badges;
  };

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: 'var(--neon-purple)', top: '5%', right: '5%' }} />
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 350, maxHeight: 350, background: 'var(--neon-cyan)', bottom: '10%', left: '5%', animationDelay: '7s' }} />

      {/* Confirm Modal */}
      {confirmModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} onClick={closeConfirm}>
          <div className="glass-card animate-fade-in-up" style={{ maxWidth: 420, width: '90%', padding: '32px 28px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>&#9888;&#65039;</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{confirmModal.title}</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{confirmModal.body}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => { const fn = confirmModal.onConfirm; closeConfirm(); fn(); }} className="btn-neon btn-neon-primary text-sm px-5">Confirm</button>
              <button onClick={closeConfirm} className="btn-neon text-sm px-5">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/dashboard" style={{ color: 'var(--text-muted)', display: 'flex' }}><BackIcon /></Link>
              <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(0,229,255,0.2)' }}>
                <GamepadIcon />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Manage Games</h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add, edit, upload files and manage contests &amp; sessions.</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyForm }); }} className="btn-neon text-sm">
            <PlusIcon /> Add Game
          </button>
        </div>

        {/* Flash */}
        {msg && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up" style={{
            background: msg.type === 'error' ? 'rgba(255,45,120,0.12)' : 'rgba(0,255,136,0.12)',
            color: msg.type === 'error' ? '#ff5c8a' : '#00ff88',
            border: `1px solid ${msg.type === 'error' ? 'rgba(255,45,120,0.25)' : 'rgba(0,255,136,0.25)'}`,
          }}>{msg.text}</div>
        )}

        {/* ── Simplified Game Form ── */}
        {showForm && (
          <div className="glass-card p-6 mb-8 animate-fade-in-up">
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
              {editingId ? 'Edit Game' : 'New Game'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-wrap gap-4 mb-4">
                <Field label="Game Name" half>
                  <input style={inputStyle} value={form.name} onChange={e => handleNameChange(e.target.value)} required />
                </Field>
                <Field label="Slug" half>
                  <input style={inputStyle} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required />
                </Field>
                <Field label="Game Path (folder name)" half>
                  <input style={inputStyle} value={form.gamePath} onChange={e => setForm(f => ({ ...f, gamePath: e.target.value }))} required />
                </Field>
                <Field label="Thumbnail (relative path)" half>
                  <input style={inputStyle} value={form.thumbnail} onChange={e => setForm(f => ({ ...f, thumbnail: e.target.value }))} placeholder="thumbnail.webp" />
                </Field>
                <Field label="Description">
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </Field>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-neon btn-neon-primary text-sm" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Game' : 'Create Game'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-neon text-sm">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Games List ── */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
          </div>
        ) : games.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>No games yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Click &quot;Add Game&quot; to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {games.map((game, i) => {
              const badges = getGameBadges(game);
              return (
                <div key={game._id} className="glass-card p-5 animate-fade-in-up flex flex-col sm:flex-row sm:items-center gap-4" style={{ animationDelay: `${i * 0.05}s`, position: 'relative', zIndex: dropdownOpen === game._id ? 10 : 1 }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>{game.name}</h3>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                        background: game.isLive ? 'rgba(0,255,136,0.1)' : 'rgba(255,45,120,0.1)',
                        color: game.isLive ? 'var(--neon-green)' : '#ff5c8a',
                        border: `1px solid ${game.isLive ? 'rgba(0,255,136,0.2)' : 'rgba(255,45,120,0.2)'}`,
                      }}>{game.isLive ? 'LIVE' : 'DRAFT'}</span>
                      {badges.map((b, j) => (
                        <span key={j} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}` }}>{b.label}</span>
                      ))}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{game.description || 'No description'}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      slug: <span style={{ color: 'var(--neon-cyan)' }}>{game.slug}</span> &nbsp;|&nbsp; path: <span style={{ color: 'var(--neon-cyan)' }}>{game.gamePath}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button onClick={() => { setUploadTargetId(game._id); setTimeout(() => fileRef.current?.click(), 0); }} className="btn-neon text-xs flex items-center gap-1.5" disabled={uploadingId === game._id}>
                      <UploadIcon /> {uploadingId === game._id ? 'Uploading...' : 'Upload ZIP'}
                    </button>

                    {/* Dropdown: Add Contest or Session */}
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setDropdownOpen(dropdownOpen === game._id ? null : game._id)} className="btn-neon text-xs flex items-center gap-1">
                        <TrophyIcon /> Manage <ChevronDown />
                      </button>
                      {dropdownOpen === game._id && (
                        <div className="glass-card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50, minWidth: 160, padding: '6px 0' }}>
                          <button onClick={() => openPanel(game, 'contest')} className="w-full text-left px-4 py-2 text-xs hover:bg-white/5" style={{ color: 'var(--neon-yellow)' }}>
                            &#127942; Contests
                          </button>
                          <button onClick={() => openPanel(game, 'session')} className="w-full text-left px-4 py-2 text-xs hover:bg-white/5" style={{ color: '#a855f7' }}>
                            &#128337; Sessions
                          </button>
                        </div>
                      )}
                    </div>

                    <button onClick={() => startEdit(game)} className="btn-neon text-xs flex items-center gap-1.5"><EditIcon /> Edit</button>
                    <button onClick={() => handleDelete(game._id)} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(255,45,120,0.1)', color: '#ff5c8a', border: '1px solid rgba(255,45,120,0.2)' }}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={() => { if (uploadTargetId) handleUpload(uploadTargetId); }} />

        {/* ── Contest/Session Management Panel ── */}
        {panelGameId && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} onClick={closePanel}>
            <div className="glass-card animate-fade-in-up" style={{ maxWidth: 750, width: '95%', maxHeight: '85vh', overflow: 'auto', padding: '28px 24px' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {panelType === 'contest' ? 'Contests' : 'Sessions'} — {games.find(g => g._id === panelGameId)?.name}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => { setShowPanelForm(true); setEditingPanelId(null); panelType === 'contest' ? setContestForm({ ...emptyContestForm }) : setSessionForm({ ...emptySessionForm }); }} className="btn-neon text-xs">
                    <PlusIcon /> New {panelType === 'contest' ? 'Contest' : 'Session'}
                  </button>
                  <button onClick={closePanel} className="btn-neon text-xs">Close</button>
                </div>
              </div>

              {/* ── Contest Form ── */}
              {showPanelForm && panelType === 'contest' && (
                <div className="glass-card p-5 mb-5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    {editingPanelId ? 'Edit Contest' : 'New Contest'}
                  </h3>
                  <form onSubmit={handleContestSubmit}>
                    <div className="flex flex-wrap gap-4 mb-4">
                      <Field label="Contest Name" half>
                        <input style={inputStyle} value={contestForm.name} onChange={e => setContestForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Week 1 Championship" />
                      </Field>
                      <Field label="Tag (e.g. Popular, New)" half>
                        <input style={inputStyle} value={contestForm.tag} onChange={e => setContestForm(f => ({ ...f, tag: e.target.value }))} placeholder="e.g. Hot" />
                      </Field>
                      <Field label="Start Date" half>
                        <input type="datetime-local" style={inputStyle} value={contestForm.startDate} onChange={e => setContestForm(f => ({ ...f, startDate: e.target.value }))} required />
                      </Field>
                      <Field label="End Date" half>
                        <input type="datetime-local" style={inputStyle} value={contestForm.endDate} onChange={e => setContestForm(f => ({ ...f, endDate: e.target.value }))} required />
                      </Field>
                      <Field label="Entry Fee (PKR, 0 = free)" half>
                        <input type="number" min="0" step="any" style={inputStyle} value={contestForm.entryFee === 0 ? '' : contestForm.entryFee} onChange={e => setContestForm(f => ({ ...f, entryFee: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="0" />
                      </Field>
                      <Field label="Min. Players for Payout" half>
                        <input type="number" min="0" style={inputStyle} value={contestForm.minPlayersThreshold === 0 ? '' : contestForm.minPlayersThreshold} onChange={e => setContestForm(f => ({ ...f, minPlayersThreshold: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="0" />
                      </Field>
                      <Field label="Accent Color" half>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="color" value={contestForm.color} onChange={e => setContestForm(f => ({ ...f, color: e.target.value }))} style={{ width: 40, height: 36, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                          <input style={{ ...inputStyle, flex: 1 }} value={contestForm.color} onChange={e => setContestForm(f => ({ ...f, color: e.target.value }))} />
                        </div>
                      </Field>
                      <Field label="Game Duration" half>
                        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <input type="checkbox" checked={contestForm.hasTimeLimit} onChange={e => setContestForm(f => ({ ...f, hasTimeLimit: e.target.checked, timeLimitSeconds: e.target.checked ? (f.timeLimitSeconds || 600) : 0 }))} /> Time-bound
                        </label>
                        {contestForm.hasTimeLimit && (
                          <div className="flex items-center gap-2 mt-2">
                            <input type="number" min="1" style={{ ...inputStyle, flex: 1 }} value={contestForm.timeLimitSeconds === 0 ? '' : Math.floor(contestForm.timeLimitSeconds / 60)} onChange={e => setContestForm(f => ({ ...f, timeLimitSeconds: (Number(e.target.value) || 0) * 60 }))} placeholder="Minutes" />
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>min</span>
                          </div>
                        )}
                      </Field>
                      <Field label="Prizes (PKR amounts)">
                        {contestForm.prizes.map((prize, i) => {
                          const ord = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`;
                          return (
                            <div key={i} className="flex gap-2 items-center mb-2">
                              <span className="text-xs font-bold shrink-0" style={{ color: 'var(--neon-cyan)', minWidth: 36 }}>{ord}</span>
                              <input type="number" min="0" step="any" style={{ ...inputStyle, flex: 1 }} value={prize || ''} onChange={e => updatePrize(i, e.target.value)} placeholder={`${ord} prize`} />
                              <button type="button" onClick={() => removePrize(i)} className="text-xs" style={{ color: '#ff5c8a' }}>&#10005;</button>
                            </div>
                          );
                        })}
                        <button type="button" onClick={addPrize} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)' }}>+ Add Prize</button>
                      </Field>
                      {/* Instructions */}
                      <Field label="Instructions (shown before game starts)">
                        {contestForm.instructions.map((inst, i) => (
                          <div key={i} className="flex gap-2 mb-2 items-start">
                            <input style={{ ...inputStyle, width: 50, textAlign: 'center' }} value={inst.icon} onChange={e => updateContestInstruction(i, 'icon', e.target.value)} placeholder="\uD83C\uDFAE" />
                            <input style={{ ...inputStyle, flex: '1 1 30%' }} value={inst.title} onChange={e => updateContestInstruction(i, 'title', e.target.value)} placeholder="Title" />
                            <input style={{ ...inputStyle, flex: '1 1 60%' }} value={inst.text} onChange={e => updateContestInstruction(i, 'text', e.target.value)} placeholder="Description" />
                            <button type="button" onClick={() => removeContestInstruction(i)} className="mt-2 text-xs" style={{ color: '#ff5c8a' }}>&#10005;</button>
                          </div>
                        ))}
                        <button type="button" onClick={addContestInstruction} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)' }}>+ Add Step</button>
                      </Field>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-neon btn-neon-primary text-xs" disabled={savingPanel}>{savingPanel ? 'Saving...' : editingPanelId ? 'Update Contest' : 'Create Contest'}</button>
                      <button type="button" onClick={() => { setShowPanelForm(false); setEditingPanelId(null); }} className="btn-neon text-xs">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── Session Form ── */}
              {showPanelForm && panelType === 'session' && (
                <div className="glass-card p-5 mb-5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    {editingPanelId ? 'Edit Session' : 'New Session'}
                  </h3>
                  <form onSubmit={handleSessionSubmit}>
                    <div className="flex flex-wrap gap-4 mb-4">
                      <Field label="Session Name" half>
                        <input style={inputStyle} value={sessionForm.name} onChange={e => setSessionForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Daily Challenge" required />
                      </Field>
                      <Field label="Tag (e.g. Popular, New)" half>
                        <input style={inputStyle} value={sessionForm.tag} onChange={e => setSessionForm(f => ({ ...f, tag: e.target.value }))} placeholder="e.g. Hot" />
                      </Field>
                      <SectionHeader icon="&#9200;" title="Period Duration" subtitle="Leaderboard resets after this time" />
                      <div style={{ display: 'flex', gap: 12, flex: '1 1 100%', flexWrap: 'wrap' }}>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min="0" style={{ ...inputStyle, width: 70 }} value={sessionForm.durationDays === 0 ? '' : sessionForm.durationDays} onChange={e => setSessionForm(f => ({ ...f, durationDays: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="0" />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>days</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min="0" max="23" style={{ ...inputStyle, width: 70 }} value={sessionForm.durationHours === 0 ? '' : sessionForm.durationHours} onChange={e => setSessionForm(f => ({ ...f, durationHours: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="0" />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>hrs</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min="0" max="59" style={{ ...inputStyle, width: 70 }} value={sessionForm.durationMinutes === 0 ? '' : sessionForm.durationMinutes} onChange={e => setSessionForm(f => ({ ...f, durationMinutes: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="0" />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>min</span>
                        </div>
                      </div>
                      <SectionHeader icon="&#128176;" title="Reward Settings" />
                      <Field label="Conversion Rate (Score per 1 PKR)" half>
                        <input type="number" min="0" step="any" style={inputStyle} value={sessionForm.conversionRate === 0 ? '' : sessionForm.conversionRate} onChange={e => setSessionForm(f => ({ ...f, conversionRate: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="e.g. 10" />
                      </Field>
                      <Field label="Show Reward Money" half>
                        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <input type="checkbox" checked={sessionForm.showCurrency} onChange={e => setSessionForm(f => ({ ...f, showCurrency: e.target.checked }))} /> Show PKR in HUD
                        </label>
                      </Field>
                      <SectionHeader icon="&#128179;" title="Pricing" />
                      <Field label="Entry Fee (PKR per period, 0 = free)" half>
                        <input type="number" min="0" step="any" style={inputStyle} value={sessionForm.entryFee === 0 ? '' : sessionForm.entryFee} onChange={e => setSessionForm(f => ({ ...f, entryFee: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="0" />
                      </Field>
                      <Field label="Attempt Cost (PKR per play)" half>
                        <input type="number" min="0" step="any" style={inputStyle} value={sessionForm.attemptCost === 0 ? '' : sessionForm.attemptCost} onChange={e => setSessionForm(f => ({ ...f, attemptCost: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="0" />
                      </Field>
                      <SectionHeader icon="&#9200;" title="Timing" />
                      <Field label="Game Duration" half>
                        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <input type="checkbox" checked={sessionForm.hasTimeLimit} onChange={e => setSessionForm(f => ({ ...f, hasTimeLimit: e.target.checked, timeLimitSeconds: e.target.checked ? (f.timeLimitSeconds || 600) : 0 }))} /> Time-bound
                        </label>
                        {sessionForm.hasTimeLimit && (
                          <div className="flex items-center gap-2 mt-2">
                            <input type="number" min="1" style={{ ...inputStyle, flex: 1 }} value={sessionForm.timeLimitSeconds === 0 ? '' : Math.floor(sessionForm.timeLimitSeconds / 60)} onChange={e => setSessionForm(f => ({ ...f, timeLimitSeconds: (Number(e.target.value) || 0) * 60 }))} placeholder="Minutes" />
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>min</span>
                          </div>
                        )}
                      </Field>
                      <Field label="Accent Color" half>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="color" value={sessionForm.color} onChange={e => setSessionForm(f => ({ ...f, color: e.target.value }))} style={{ width: 40, height: 36, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                          <input style={{ ...inputStyle, flex: 1 }} value={sessionForm.color} onChange={e => setSessionForm(f => ({ ...f, color: e.target.value }))} />
                        </div>
                      </Field>
                      {/* Instructions */}
                      <Field label="Instructions (shown before game starts)">
                        {sessionForm.instructions.map((inst, i) => (
                          <div key={i} className="flex gap-2 mb-2 items-start">
                            <input style={{ ...inputStyle, width: 50, textAlign: 'center' }} value={inst.icon} onChange={e => updateSessionInstruction(i, 'icon', e.target.value)} placeholder="\uD83C\uDFAE" />
                            <input style={{ ...inputStyle, flex: '1 1 30%' }} value={inst.title} onChange={e => updateSessionInstruction(i, 'title', e.target.value)} placeholder="Title" />
                            <input style={{ ...inputStyle, flex: '1 1 60%' }} value={inst.text} onChange={e => updateSessionInstruction(i, 'text', e.target.value)} placeholder="Description" />
                            <button type="button" onClick={() => removeSessionInstruction(i)} className="mt-2 text-xs" style={{ color: '#ff5c8a' }}>&#10005;</button>
                          </div>
                        ))}
                        <button type="button" onClick={addSessionInstruction} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)' }}>+ Add Step</button>
                      </Field>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-neon btn-neon-primary text-xs" disabled={savingPanel}>{savingPanel ? 'Saving...' : editingPanelId ? 'Update Session' : 'Create Session'}</button>
                      <button type="button" onClick={() => { setShowPanelForm(false); setEditingPanelId(null); }} className="btn-neon text-xs">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── Items List ── */}
              {panelLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
                </div>
              ) : panelItems.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  No {panelType === 'contest' ? 'contests' : 'sessions'} yet. Click &quot;New {panelType === 'contest' ? 'Contest' : 'Session'}&quot; to create one.
                </p>
              ) : panelType === 'contest' ? (
                /* Contest items */
                <div className="grid gap-3">
                  {panelItems.map((c) => {
                    const statusColors = {
                      scheduled: { bg: 'rgba(0,229,255,0.1)', color: 'var(--neon-cyan)', border: 'rgba(0,229,255,0.2)' },
                      live: { bg: 'rgba(0,255,136,0.1)', color: 'var(--neon-green)', border: 'rgba(0,255,136,0.2)' },
                      ended: { bg: 'rgba(255,217,61,0.1)', color: 'var(--neon-yellow)', border: 'rgba(255,217,61,0.2)' },
                      distributed: { bg: 'rgba(168,85,247,0.1)', color: '#a855f7', border: 'rgba(168,85,247,0.2)' },
                      cancelled: { bg: 'rgba(255,45,120,0.1)', color: '#ff5c8a', border: 'rgba(255,45,120,0.2)' },
                    };
                    const sc = statusColors[c.status] || statusColors.scheduled;
                    return (
                      <div key={c._id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {c.name && <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{c.name}</span>}
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{c.status}</span>
                            {c.entryFee > 0 ? (
                              <span className="text-[10px]" style={{ color: 'var(--neon-yellow)' }}>Entry: PKR {c.entryFee}</span>
                            ) : (
                              <span className="text-[10px]" style={{ color: 'var(--neon-green)' }}>FREE</span>
                            )}
                            {c.prizes?.length > 0 && <span className="text-[10px]" style={{ color: 'var(--neon-cyan)' }}>Prizes: {c.prizes.join(', ')}</span>}
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {new Date(c.startDate).toLocaleString()} &#8594; {new Date(c.endDate).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {(c.status === 'scheduled' || c.status === 'live') && (
                            <button onClick={() => startEditContest(c)} className="btn-neon text-xs"><EditIcon /> Edit</button>
                          )}
                          {(c.status === 'scheduled' || c.status === 'live') && (
                            <button onClick={() => handleCancelContest(c._id)} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(255,217,61,0.1)', color: 'var(--neon-yellow)', border: '1px solid rgba(255,217,61,0.2)' }}>End</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Session items */
                <div className="grid gap-3">
                  {panelItems.map((s) => (
                    <div key={s._id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: 'rgba(0,0,0,0.2)', opacity: s.ended ? 0.6 : 1 }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{s.name || 'Unnamed Session'}</span>
                          {s.ended ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>ENDED</span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                              background: s.isActive ? (s.pause ? 'rgba(255,193,7,0.1)' : 'rgba(0,255,136,0.1)') : 'rgba(255,45,120,0.1)',
                              color: s.isActive ? (s.pause ? '#ffc107' : 'var(--neon-green)') : '#ff5c8a',
                              border: `1px solid ${s.isActive ? (s.pause ? 'rgba(255,193,7,0.2)' : 'rgba(0,255,136,0.2)') : 'rgba(255,45,120,0.2)'}`,
                            }}>{s.isActive ? (s.pause ? 'PAUSING...' : 'ACTIVE') : 'PAUSED'}</span>
                          )}
                          {s.entryFee > 0 ? (
                            <span className="text-[10px]" style={{ color: 'var(--neon-yellow)' }}>Entry: PKR {s.entryFee}</span>
                          ) : (
                            <span className="text-[10px]" style={{ color: 'var(--neon-green)' }}>FREE</span>
                          )}
                          {s.attemptCost > 0 && <span className="text-[10px]" style={{ color: 'var(--neon-yellow)' }}>PKR {s.attemptCost}/play</span>}
                          {s.conversionRate > 0 && <span className="text-[10px]" style={{ color: 'var(--neon-cyan)' }}>Rate: {s.conversionRate}</span>}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Period: {s.durationDays || 0}d {s.durationHours || 0}h {s.durationMinutes || 0}m
                          {s.ended && s.periodAnchor && ` · Ran ${new Date(s.periodAnchor).toLocaleDateString()}`}
                        </p>
                      </div>
                      {!s.ended ? (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => toggleSessionActive(s._id, s)} className="btn-neon text-xs">
                            {s.pause ? 'Unpause' : 'Pause'}
                          </button>
                          <button onClick={() => startEditSession(s)} className="btn-neon text-xs"><EditIcon /> Edit</button>
                          <button onClick={() => handleDeleteSession(s._id)} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(255,45,120,0.1)', color: '#ff5c8a', border: '1px solid rgba(255,45,120,0.2)' }}>
                            <TrashIcon />
                          </button>
                        </div>
                      ) : s.pause ? (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => toggleSessionActive(s._id, s)} className="btn-neon text-xs">
                            Unpause
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardGamesPage() {
  return (
    <AdminRoute>
      <GamesManagement />
    </AdminRoute>
  );
}
