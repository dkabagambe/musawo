export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded-xl w-48" />
      <div className="h-4 bg-gray-100 rounded-xl w-64" />
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
