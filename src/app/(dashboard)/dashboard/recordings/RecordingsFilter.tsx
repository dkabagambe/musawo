"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState } from "react";

export default function RecordingsFilter({
  courses,
  currentQuery,
  currentCourse,
}: {
  courses: Array<{ id: string; title: string }>;
  currentQuery: string;
  currentCourse: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(currentQuery);

  function update(param: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") {
      params.set(param, value);
    } else {
      params.delete(param);
    }
    router.push(`/dashboard/recordings?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search recordings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", search);
          }}
          onBlur={() => update("q", search)}
          className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-800 text-primary placeholder:text-gray-400 focus:outline-none focus:border-primary/40"
        />
        {search && (
          <button
            onClick={() => { setSearch(""); update("q", ""); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Course filter */}
      {courses.length > 1 && (
        <select
          value={currentCourse}
          onChange={(e) => update("course", e.target.value)}
          className="py-2 px-3 text-sm rounded-xl border border-border bg-white dark:bg-gray-800 text-primary focus:outline-none focus:border-primary/40"
          aria-label="Filter by course"
        >
          <option value="all">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
