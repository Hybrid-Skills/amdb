export default function ProfilesLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 animate-pulse">
      <div className="h-14 border-b border-white/5 bg-black/60" />
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/10" />
          <div className="space-y-2">
            <div className="h-7 w-32 rounded bg-white/10" />
            <div className="h-4 w-20 rounded bg-white/5" />
          </div>
        </div>
        <div className="h-28 rounded-2xl bg-white/5" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
