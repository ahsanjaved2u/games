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
  name: '', slug: '', description: '', thumbnail: 'images/background.png',
  isLive: false, gamePath: '',
  tag: '', color: '#00e5ff', gameType: 'rewarding',
  isFree: true,
  conversionRate: 0, showCurrency: false, prizes: [],
  rewardPeriodDays: 0, rewardPeriodHours: 0, rewardPeriodMinutes: 0,
  entryFee: 0,
  attemptCost: 0,
  instructions: [],
  scheduleStart: '', scheduleEnd: '', showSchedule: false,
  minPlayersThreshold: 0,
  hasTimeLimit: false, timeLimitSeconds: 0,
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

  // Always start at top of page on load/refresh
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  /* Auto-generate slug from name */
  const handleNameChange = (val) => {
    setForm(f => ({
      ...f,
      name: val,
      slug: editingId ? f.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      gamePath: editingId ? f.gamePath : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  /* Prize helpers */
  const addPrize = () => setForm(f => ({ ...f, prizes: [...f.prizes, 0] }));
  const removePrize = (idx) => setForm(f => ({ ...f, prizes: f.prizes.filter((_, i) => i !== idx) }));
  const updatePrize = (idx, val) => setForm(f => {
    const copy = [...f.prizes];
    copy[idx] = val === '' ? 0 : Number(val);
    return { ...f, prizes: copy };
  });

  /* Instructions helpers */
  const addInstruction = () => setForm(f => ({ ...f, instructions: [...f.instructions, { icon: '🎮', title: '', text: '' }] }));
  const removeInstruction = (idx) => setForm(f => ({ ...f, instructions: f.instructions.filter((_, i) => i !== idx) }));
  const updateInstruction = (idx, field, val) => setForm(f => {
    const copy = [...f.instructions];
    copy[idx] = { ...copy[idx], [field]: val };
    return { ...f, instructions: copy };
  });

  /* Submit create / update */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await authFetch(`/games/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        flash('Game updated');
      } else {
        await authFetch('/games', { method: 'POST', body: JSON.stringify(form) });
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

  /* Edit */
  // datetime-local inputs need "YYYY-MM-DDTHH:MM" in LOCAL time, not UTC
  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d - offset).toISOString().slice(0, 16);
  };

  const startEdit = (game) => {
    setForm({
      name: game.name || '',
      slug: game.slug || '',
      description: game.description || '',
      thumbnail: game.thumbnail || '',
      isLive: game.isLive || false,
      gamePath: game.gamePath || '',
      tag: game.tag || '',
      color: game.color || '#00e5ff',
      gameType: game.gameType || 'rewarding',
      isFree: !(game.entryFee > 0 || game.attemptCost > 0),
      conversionRate: game.conversionRate || 0,
      showCurrency: game.showCurrency || false,
      prizes: game.prizes || [],
      rewardPeriodDays: game.rewardPeriodDays || 0,
      rewardPeriodHours: game.rewardPeriodHours || 0,
      rewardPeriodMinutes: game.rewardPeriodMinutes || 0,
      entryFee: game.entryFee || 0,
      attemptCost: game.attemptCost || 0,
      instructions: game.instructions || [],
      scheduleStart: toLocalInput(game.scheduleStart),
      scheduleEnd: toLocalInput(game.scheduleEnd),
      showSchedule: game.showSchedule || false,
      minPlayersThreshold: game.minPlayersThreshold || 0,
      hasTimeLimit: game.hasTimeLimit || false,
      timeLimitSeconds: game.timeLimitSeconds || 0,
    });
    setEditingId(game._id);
    setShowForm(true);
  };

  /* Delete */
  const handleDelete = (id) => {
    showConfirm(
      'Delete Game?',
      'This will permanently remove the game and all its data.',
      async () => {
        try {
          await authFetch(`/games/${id}`, { method: 'DELETE' });
          flash('Game deleted');
          fetchGames();
        } catch (err) {
          flash(err.message || 'Delete failed', 'error');
        }
      }
    );
  };

  /* Toggle live */
  const handleToggle = async (id) => {
    try {
      const data = await authFetch(`/games/${id}/toggle-live`, { method: 'PATCH' });
      setGames(prev => prev.map(g => g._id === id ? { ...g, isLive: data.isLive } : g));
    } catch (err) {
      flash(err.message || 'Toggle failed', 'error');
    }
  };

  /* End competition early + distribute prizes */
  const handleEndCompetition = (id) => {
    showConfirm(
      'End Competition Now?',
      'Prizes will be distributed to the top players immediately. This cannot be undone.',
      async () => {
        try {
          const data = await authFetch(`/games/${id}/end-competition`, { method: 'PATCH' });
          flash(data.distributed ? `Prizes distributed to ${data.results?.length || 0} winner(s)!` : (data.reason || 'Competition ended'));
          fetchGames();
        } catch (err) {
          flash(err.message || 'Failed to end competition', 'error');
        }
      }
    );
  };

  /* Upload ZIP */
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
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      flash('Files uploaded & extracted');
    } catch (err) {
      flash(err.message || 'Upload failed', 'error');
    }
    setUploadingId(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: 'var(--neon-purple)', top: '5%', right: '5%' }} />
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 350, maxHeight: 350, background: 'var(--neon-cyan)', bottom: '10%', left: '5%', animationDelay: '7s' }} />

      {/* ── Custom Confirm Modal ── */}
      {confirmModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} onClick={closeConfirm}>
          <div className="glass-card animate-fade-in-up" style={{ maxWidth: 420, width: '90%', padding: '32px 28px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>⚠️</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{confirmModal.title}</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{confirmModal.body}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => { const fn = confirmModal.onConfirm; closeConfirm(); fn(); }}
                className="btn-neon btn-neon-primary text-sm px-5"
              >Confirm</button>
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
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add, edit, upload files and toggle games live.</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyForm }); }} className="btn-neon text-sm">
            <PlusIcon /> Add Game
          </button>
        </div>

        {/* Flash message */}
        {msg && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up" style={{
            background: msg.type === 'error' ? 'rgba(255,45,120,0.12)' : 'rgba(0,255,136,0.12)',
            color: msg.type === 'error' ? '#ff5c8a' : '#00ff88',
            border: `1px solid ${msg.type === 'error' ? 'rgba(255,45,120,0.25)' : 'rgba(0,255,136,0.25)'}`,
          }}>{msg.text}</div>
        )}

        {/* ── Form Modal ── */}
        {showForm && (
          <div className="glass-card p-6 mb-8 animate-fade-in-up">
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
              {editingId ? 'Edit Game' : 'New Game'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-wrap gap-4 mb-4">

                {/* ─── BASIC INFO ─── */}
                <SectionHeader icon="📋" title="Basic Info" />
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
                  <input style={inputStyle} value={form.thumbnail} onChange={e => setForm(f => ({ ...f, thumbnail: e.target.value }))} placeholder="images/background.png" />
                </Field>
                <Field label="Description">
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </Field>
                <Field label="Tag (e.g. Popular, New)" half>
                  <input style={inputStyle} value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} />
                </Field>
                <Field label="Accent Color" half>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 40, height: 36, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                    <input style={{ ...inputStyle, flex: 1 }} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                  </div>
                </Field>

                {/* ─── TYPE & PRICING ─── */}
                <SectionHeader icon="🎮" title="Type & Pricing" />
                <Field label="Game Type" half>
                  <select style={selectStyle} value={form.gameType} onChange={e => setForm(f => ({ ...f, gameType: e.target.value }))}>
                    <option value="rewarding" style={{ background: '#1a1a3e', color: '#fff' }}>Rewarding</option>
                    <option value="competitive" style={{ background: '#1a1a3e', color: '#fff' }}>Competitive</option>
                  </select>
                </Field>
                <Field label="Pricing" half>
                  <select style={selectStyle} value={form.isFree ? 'free' : 'paid'} onChange={e => {
                    const free = e.target.value === 'free';
                    setForm(f => ({ ...f, isFree: free, ...(free ? { entryFee: 0, attemptCost: 0 } : {}) }));
                  }}>
                    <option value="free" style={{ background: '#1a1a3e', color: '#fff' }}>Free</option>
                    <option value="paid" style={{ background: '#1a1a3e', color: '#fff' }}>Paid</option>
                  </select>
                </Field>

                {/* ─── REWARDING CONFIG ─── */}
                {form.gameType === 'rewarding' && (
                  <>
                    <SectionHeader icon="💰" title="Reward Settings" subtitle="Configure how players earn money from this game" />
                    <Field label="Conversion Rate (Score per 1 PKR)" half>
                      <input type="number" min="0" step="any" style={inputStyle} placeholder="e.g. 10 = 10 score per 1 PKR" value={form.conversionRate === 0 ? '' : form.conversionRate} onChange={e => setForm(f => ({ ...f, conversionRate: e.target.value === '' ? 0 : Number(e.target.value) }))} />
                    </Field>
                    <Field label="Show Reward Money" half>
                      <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <input type="checkbox" checked={form.showCurrency} onChange={e => setForm(f => ({ ...f, showCurrency: e.target.checked }))} /> Show PKR in game HUD
                      </label>
                    </Field>
                    <Field label="Reward Period (new leaderboard + reward after this time)">
                      <div className="flex gap-3 items-center flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <input type="number" min="0" style={{ ...inputStyle, width: 70 }} value={form.rewardPeriodDays === 0 ? '' : form.rewardPeriodDays} onChange={e => setForm(f => ({ ...f, rewardPeriodDays: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="0" />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>days</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min="0" max="23" style={{ ...inputStyle, width: 70 }} value={form.rewardPeriodHours === 0 ? '' : form.rewardPeriodHours} onChange={e => setForm(f => ({ ...f, rewardPeriodHours: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="0" />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>hrs</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min="0" max="59" style={{ ...inputStyle, width: 70 }} value={form.rewardPeriodMinutes === 0 ? '' : form.rewardPeriodMinutes} onChange={e => setForm(f => ({ ...f, rewardPeriodMinutes: e.target.value === '' ? 0 : Number(e.target.value) }))} placeholder="0" />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>min</span>
                        </div>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Leave all at 0 for no time restriction (one combined record forever)</p>
                    </Field>
                    {!form.isFree && (
                      <Field label="Attempt Cost — per play (PKR)" half>
                        <input type="number" min="0" step="any" style={inputStyle} placeholder="Cost per play" value={form.attemptCost === 0 ? '' : form.attemptCost} onChange={e => setForm(f => ({ ...f, attemptCost: e.target.value === '' ? 0 : Number(e.target.value) }))} />
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Charged <b>every single play</b>. Player pays each time they hit Start.</p>
                      </Field>
                    )}
                  </>
                )}

                {/* ─── COMPETITIVE CONFIG ─── */}
                {form.gameType === 'competitive' && (
                  <>
                    <SectionHeader icon="🏆" title="Competition Settings" subtitle="Configure entry fees, prizes, and competition rules" />
                    {!form.isFree && (
                      <Field label="Entry Fee — per contest (PKR)" half>
                        <input type="number" min="0" step="any" style={inputStyle} placeholder="Entry fee" value={form.entryFee === 0 ? '' : form.entryFee} onChange={e => setForm(f => ({ ...f, entryFee: e.target.value === '' ? 0 : Number(e.target.value) }))} />
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Charged <b>once</b> per contest to enter.</p>
                      </Field>
                    )}
                    <Field label="Prizes (PKR amounts)">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {form.prizes.map((prize, i) => {
                          const ordinal = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`;
                          return (
                            <div key={i} className="flex gap-2 items-center">
                              <span className="text-xs font-bold shrink-0" style={{ color: 'var(--neon-cyan)', minWidth: 36 }}>{ordinal}</span>
                              <input type="number" min="0" step="any" style={{ ...inputStyle, flex: 1 }} value={prize || ''} onChange={e => updatePrize(i, e.target.value)} placeholder={`${ordinal} prize in PKR (e.g. 5000)`} />
                              <button type="button" onClick={() => removePrize(i)} className="text-xs" style={{ color: '#ff5c8a' }}>✕</button>
                            </div>
                          );
                        })}
                        <button type="button" onClick={addPrize} className="text-xs font-semibold px-3 py-1.5 rounded-lg self-start" style={{ color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)' }}>+ Add Prize</button>
                      </div>
                    </Field>
                    <Field label="Min. Players for Payout" half>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <input type="checkbox"
                            checked={form.minPlayersThreshold > 0}
                            onChange={e => setForm(f => ({ ...f, minPlayersThreshold: e.target.checked ? 2 : 0 }))}
                          /> Require minimum players
                        </label>
                        {form.minPlayersThreshold > 0 && (
                          <input type="number" min="1" style={inputStyle} value={form.minPlayersThreshold} onChange={e => setForm(f => ({ ...f, minPlayersThreshold: Number(e.target.value) }))} placeholder="e.g. 10" />
                        )}
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Prizes only distribute if this many players competed.</p>
                    </Field>
                  </>
                )}

                {/* ─── TIMING & PUBLISHING ─── */}
                <SectionHeader icon="⏱️" title="Timing & Publishing" />
                <Field label="Game Duration" half>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={form.hasTimeLimit} onChange={e => setForm(f => ({ ...f, hasTimeLimit: e.target.checked, timeLimitSeconds: e.target.checked ? (f.timeLimitSeconds || 600) : 0 }))} /> Time-bound game
                    </label>
                    {form.hasTimeLimit && (
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" style={{ ...inputStyle, flex: 1 }} value={form.timeLimitSeconds === 0 ? '' : Math.floor(form.timeLimitSeconds / 60)} onChange={e => setForm(f => ({ ...f, timeLimitSeconds: (Number(e.target.value) || 0) * 60 }))} placeholder="Minutes" />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>minutes</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>If enabled, game ends automatically after the set duration.</p>
                </Field>
                {form.gameType === 'rewarding' && (
                  <Field label="Live on site" half>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={form.isLive} onChange={e => setForm(f => ({ ...f, isLive: e.target.checked }))} /> Published
                    </label>
                  </Field>
                )}
                {form.gameType === 'competitive' && (
                  <Field label="Publishing" half>
                    <p className="text-xs" style={{ color: 'var(--neon-yellow)' }}>Auto-managed by schedule. No manual publish needed.</p>
                  </Field>
                )}

                {/* ─── SCHEDULE (competitive only) ─── */}
                {form.gameType === 'competitive' && (
                  <>
                    <SectionHeader icon="📅" title="Competition Schedule" subtitle="Set when the competition starts and ends" />
                    <Field label="Schedule Start" half>
                      <input type="datetime-local" style={inputStyle} value={form.scheduleStart} onChange={e => setForm(f => ({ ...f, scheduleStart: e.target.value }))} />
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Game goes live automatically at this time.</p>
                    </Field>
                    <Field label="Schedule End" half>
                      <input type="datetime-local" style={inputStyle} value={form.scheduleEnd} onChange={e => setForm(f => ({ ...f, scheduleEnd: e.target.value }))} />
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Competition ends and prizes auto-distribute at this time.</p>
                    </Field>
                  </>
                )}
              </div>

              {/* Instructions */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Instructions (shown before game starts)</span>
                  <button type="button" onClick={addInstruction} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)' }}>+ Add Step</button>
                </div>
                {form.instructions.map((inst, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-start">
                    <input style={{ ...inputStyle, width: 50, textAlign: 'center' }} value={inst.icon} onChange={e => updateInstruction(i, 'icon', e.target.value)} placeholder="🎮" />
                    <input style={{ ...inputStyle, flex: '1 1 30%' }} value={inst.title} onChange={e => updateInstruction(i, 'title', e.target.value)} placeholder="Title" />
                    <input style={{ ...inputStyle, flex: '1 1 60%' }} value={inst.text} onChange={e => updateInstruction(i, 'text', e.target.value)} placeholder="Description" />
                    <button type="button" onClick={() => removeInstruction(i)} className="mt-2 text-xs" style={{ color: '#ff5c8a' }}>✕</button>
                  </div>
                ))}
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
            {games.map((game, i) => (
              <div key={game._id} className="glass-card p-5 animate-fade-in-up flex flex-col sm:flex-row sm:items-center gap-4" style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>{game.name}</h3>
                    {game.tag && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,255,136,0.1)', color: 'var(--neon-green)', border: '1px solid rgba(0,255,136,0.2)' }}>{game.tag}</span>
                    )}
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                      background: game.isLive ? 'rgba(0,255,136,0.1)' : 'rgba(255,45,120,0.1)',
                      color: game.isLive ? 'var(--neon-green)' : '#ff5c8a',
                      border: `1px solid ${game.isLive ? 'rgba(0,255,136,0.2)' : 'rgba(255,45,120,0.2)'}`,
                    }}>{game.isLive ? 'LIVE' : 'DRAFT'}</span>
                    {(game.entryFee > 0 || game.attemptCost > 0) ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                        background: 'rgba(255,217,61,0.1)',
                        color: 'var(--neon-yellow)',
                        border: '1px solid rgba(255,217,61,0.2)',
                      }}>{game.entryFee > 0 ? `Entry PKR ${game.entryFee}` : `PKR ${game.attemptCost}/play`}</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                        background: 'rgba(0,255,136,0.1)',
                        color: 'var(--neon-green)',
                        border: '1px solid rgba(0,255,136,0.2)',
                      }}>FREE</span>
                    )}
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                      background: game.gameType === 'competitive' ? 'rgba(255,217,61,0.1)' : 'rgba(168,85,247,0.1)',
                      color: game.gameType === 'competitive' ? 'var(--neon-yellow)' : '#a855f7',
                      border: `1px solid ${game.gameType === 'competitive' ? 'rgba(255,217,61,0.2)' : 'rgba(168,85,247,0.2)'}`,
                    }}>{game.gameType === 'competitive' ? 'COMPETITIVE' : 'REWARDING'}</span>
                    {game.gameType === 'competitive' && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                        background: game.prizesDistributed ? 'rgba(0,255,136,0.1)' : 'rgba(255,217,61,0.1)',
                        color: game.prizesDistributed ? 'var(--neon-green)' : 'var(--neon-yellow)',
                        border: `1px solid ${game.prizesDistributed ? 'rgba(0,255,136,0.2)' : 'rgba(255,217,61,0.2)'}`,
                      }}>{game.prizesDistributed ? 'PRIZES PAID' : 'ACTIVE'}</span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{game.description || 'No description'}</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    slug: <span style={{ color: 'var(--neon-cyan)' }}>{game.slug}</span> &nbsp;|&nbsp; path: <span style={{ color: 'var(--neon-cyan)' }}>{game.gamePath}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* Upload ZIP */}
                  <button
                    onClick={() => { setUploadTargetId(game._id); setTimeout(() => fileRef.current?.click(), 0); }}
                    className="btn-neon text-xs flex items-center gap-1.5"
                    disabled={uploadingId === game._id}
                  >
                    <UploadIcon /> {uploadingId === game._id ? 'Uploading...' : 'Upload ZIP'}
                  </button>
                  {/* End Competition (competitive games only, not yet distributed) */}
                  {game.gameType === 'competitive' && !game.prizesDistributed && (
                    <button onClick={() => handleEndCompetition(game._id)} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(255,217,61,0.1)', color: 'var(--neon-yellow)', border: '1px solid rgba(255,217,61,0.2)' }}>
                      End Now
                    </button>
                  )}
                  {/* Edit */}
                  <button onClick={() => startEdit(game)} className="btn-neon text-xs flex items-center gap-1.5">
                    <EditIcon /> Edit
                  </button>
                  {/* Delete */}
                  <button onClick={() => handleDelete(game._id)} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(255,45,120,0.1)', color: '#ff5c8a', border: '1px solid rgba(255,45,120,0.2)' }}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input for uploads */}
        <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={() => { if (uploadTargetId) handleUpload(uploadTargetId); }} />
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
