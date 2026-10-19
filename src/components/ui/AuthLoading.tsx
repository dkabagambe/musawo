/**
 * Auth page loading skeleton.
 * Matches the split-panel auth layout: photo left, form right.
 */
export default function AuthLoading() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white animate-pulse">
      {/* Photo panel placeholder */}
      <div className="hidden lg:block lg:w-1/2 bg-primary/10 flex-shrink-0" />

      {/* Form panel placeholder */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="h-5 w-40 bg-gray-200 rounded-lg" />
          </div>
          {/* Heading */}
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded-xl" />
            <div className="h-4 w-64 bg-gray-100 rounded-lg" />
          </div>
          {/* Fields */}
          <div className="space-y-4">
            <div className="h-12 w-full bg-gray-100 rounded-xl" />
            <div className="h-12 w-full bg-gray-100 rounded-xl" />
            <div className="h-12 w-full bg-primary/20 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
