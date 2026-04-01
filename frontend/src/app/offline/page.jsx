export default function OfflinePage() {
  return (
    <div className="bg-grid relative" style={{ minHeight: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ fontSize: 72, marginBottom: 16, filter: 'drop-shadow(0 0 24px rgba(255,217,61,0.4))' }}>📡</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-3" style={{ color: 'var(--text-primary)' }}>You&apos;re Offline</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', maxWidth: 360 }}>
          No internet connection. Check your network and try again.
        </p>
        <button onClick={() => typeof window !== 'undefined' && window.location.reload()} className="btn-neon btn-neon-primary text-sm px-6 py-2.5">
          🔄 Retry
        </button>
      </div>
    </div>
  );
}
