export default function GameCardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
          <div className="h-40 sm:h-48 skeleton-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-4 w-2/3 rounded skeleton-pulse" />
            <div className="h-20 rounded-xl skeleton-pulse" />
            <div className="h-10 rounded-xl skeleton-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
