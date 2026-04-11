/**
 * Reusable skeleton loading components for professional loading states.
 */

export function SkeletonPulse({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded-full animate-pulse w-1/3" />
          <div className="h-3 bg-slate-100 rounded-full animate-pulse w-1/2" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-slate-100 rounded-full animate-pulse" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="w-16 h-6 bg-slate-100 rounded-full animate-pulse" />
      </div>
      <div className="h-8 bg-slate-200 rounded-xl animate-pulse w-20 mb-2" />
      <div className="h-3 bg-slate-100 rounded-full animate-pulse w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-5 border-b border-slate-100 bg-slate-50/50">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded-full animate-pulse flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 p-5 border-b border-slate-50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3 bg-slate-100 rounded-full animate-pulse flex-1" style={{ opacity: 1 - r * 0.1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="animate-fade-in space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
      </div>
      {/* Chart + cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 h-72">
            <div className="h-5 bg-slate-200 rounded-full animate-pulse w-40 mb-6" />
            <div className="flex items-end gap-3 h-48">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 bg-slate-100 rounded-t-lg animate-pulse" style={{ height: `${30 + Math.random() * 60}%` }} />
              ))}
            </div>
          </div>
        </div>
        <SkeletonCard lines={4} />
      </div>
      {/* Table */}
      <SkeletonTable rows={4} cols={5} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {Icon && (
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
          <Icon size={32} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-xl font-extrabold text-slate-700 mb-2">{title}</h3>
      {description && <p className="text-slate-400 font-bold text-sm max-w-md">{description}</p>}
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:scale-105 transition-transform"
        >
          {action}
        </button>
      )}
    </div>
  );
}
