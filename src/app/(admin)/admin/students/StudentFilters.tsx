"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

interface Course {
  id: string;
  title: string;
  courseCode: string;
}

interface Intake {
  id: string;
  label: string;
}

interface Props {
  courses: Course[];
  intakes: Intake[];
  currentSearch: string;
  currentCourse: string;
  currentIntake: string;
  currentStatus: string;
}

export default function StudentFilters({
  courses,
  intakes,
  currentSearch,
  currentCourse,
  currentIntake,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);

  function handleFilterChange(key: string, value: string) {
    const params = new URLSearchParams();
    
    // Keep existing filters
    if (search) params.set("search", search);
    if (currentCourse) params.set("course", currentCourse);
    if (currentIntake) params.set("intake", currentIntake);
    if (currentStatus) params.set("status", currentStatus);
    
    // Update the changed filter
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    router.push(`/admin/students?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    handleFilterChange("search", search);
  }

  return (
    <div className="card">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="lg:col-span-2">
          <label className="label text-xs">Search</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or registration number..."
              className="input text-sm flex-1"
            />
            <button type="submit" className="btn-primary px-4">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Course filter */}
        <div>
          <label className="label text-xs">Course</label>
          <select
            value={currentCourse}
            onChange={(e) => handleFilterChange("course", e.target.value)}
            className="input text-sm"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.courseCode} - {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Intake filter */}
        <div>
          <label className="label text-xs">Intake</label>
          <select
            value={currentIntake}
            onChange={(e) => handleFilterChange("intake", e.target.value)}
            className="input text-sm"
          >
            <option value="">All intakes</option>
            {intakes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label className="label text-xs">Status</label>
          <select
            value={currentStatus}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="input text-sm"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="INVITED">Invited</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Active filters display */}
      {(currentSearch || currentCourse || currentIntake || currentStatus) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
          <span className="text-xs text-gray-500">Active filters:</span>
          {currentSearch && (
            <span className="badge badge-info text-xs">
              Search: {currentSearch}
            </span>
          )}
          {currentCourse && (
            <span className="badge badge-info text-xs">
              Course: {courses.find((c) => c.id === currentCourse)?.courseCode}
            </span>
          )}
          {currentIntake && (
            <span className="badge badge-info text-xs">
              Intake: {intakes.find((i) => i.id === currentIntake)?.label}
            </span>
          )}
          {currentStatus && (
            <span className="badge badge-info text-xs">Status: {currentStatus}</span>
          )}
          <button
            onClick={() => router.push("/admin/students")}
            className="text-xs text-primary hover:underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
