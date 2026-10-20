/**
 * Public page loading skeleton - matches the PageHero + content layout.
 */
export default function PublicLoading() {
  return (
    <div className="bg-surface animate-pulse">
      {/* Hero */}
      <div className="h-64 sm:h-80 bg-primary/10" />
      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        <div className="space-y-3 text-center">
          <div className="h-4 w-24 bg-gray-200 rounded mx-auto" />
          <div className="h-9 w-72 bg-gray-200 rounded-xl mx-auto" />
          <div className="h-4 w-96 bg-gray-100 rounded mx-auto" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-6 space-y-3">
              <div className="h-11 w-11 bg-gray-100 rounded-xl" />
              <div className="h-5 w-32 bg-gray-200 rounded-lg" />
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-4/5 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
