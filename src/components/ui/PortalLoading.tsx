/**
 * Shared portal page loading skeleton.
 * Shown by Next.js while the server component fetches data.
 * The AppShell (sidebar + header) is already rendered — only the
 * content area is replaced with this skeleton.
 */
export default function PortalLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* Page title bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 rounded-xl" />
          <div className="h-4 w-32 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-9 w-28 bg-gray-200 rounded-xl" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5 space-y-3">
            <div className="w-9 h-9 bg-gray-100 rounded-xl" />
            <div className="h-7 w-16 bg-gray-200 rounded-lg" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <div className="h-5 w-36 bg-gray-200 rounded-lg" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 flex-1 bg-gray-100 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
              <div className="h-6 w-14 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
