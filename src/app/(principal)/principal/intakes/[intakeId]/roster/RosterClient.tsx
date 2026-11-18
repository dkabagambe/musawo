"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  studentNumber: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: Date;
}

interface Enrolment {
  id: string;
  userId: string;
  status: string;
  user: User;
}

interface Instructor {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

interface CoTutor {
  tutor: Instructor;
}

interface Course {
  id: string;
  title: string;
  courseCode: string | null;
  tutor: Instructor;
  coTutors: CoTutor[];
}

interface Intake {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  seats: number;
  isOpen: boolean;
  course: Course;
  enrolments: Enrolment[];
}

interface Props {
  intake: Intake;
  canEdit: boolean;
}

export default function RosterClient({ intake, canEdit }: Props) {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEnrolments = intake.enrolments.filter(
    (e) =>
      e.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.user.studentNumber?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "badge-success";
      case "SUSPENDED":
        return "badge-danger";
      case "PENDING_PAYMENT":
        return "badge-warning";
      case "PARTIALLY_PAID":
        return "badge-info";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/principal/classes" className="text-sm text-accent hover:underline mb-2 inline-block">
          ← Back to Classes
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Class Roster</h1>
            <p className="text-sm text-gray-500 mt-1">
              {intake.course.title} • {intake.label}
            </p>
            <p className="text-sm text-gray-500">
              {format(new Date(intake.startDate), "MMM d, yyyy")} -{" "}
              {format(new Date(intake.endDate), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/principal/intakes/${intake.id}/groups`}
              className="btn-ghost text-sm"
            >
              Breakaway Groups
            </Link>
            {canEdit && (
              <button className="btn-primary text-sm">
                Export Roster
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Instructors Card */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Instructors</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {intake.course.tutor.avatarUrl ? (
                <Image
                  src={intake.course.tutor.avatarUrl}
                  alt={intake.course.tutor.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-600">
                  {getInitials(intake.course.tutor.name)}
                </div>
              )}
            </div>
            <div>
              <p className="font-medium">{intake.course.tutor.name}</p>
              <p className="text-xs text-gray-500">Lead Instructor</p>
            </div>
          </div>
          {intake.course.coTutors.map((ct) => (
            <div key={ct.tutor.id} className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {ct.tutor.avatarUrl ? (
                  <Image
                    src={ct.tutor.avatarUrl}
                    alt={ct.tutor.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-600">
                    {getInitials(ct.tutor.name)}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">{ct.tutor.name}</p>
                <p className="text-xs text-gray-500">Co-Instructor</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="text-2xl font-bold">{intake.enrolments.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Available Seats</p>
          <p className="text-2xl font-bold">{intake.seats - intake.enrolments.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold">
            {intake.enrolments.filter((e) => e.user.status === "ACTIVE").length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Status</p>
          <span className={`badge ${intake.isOpen ? "badge-success" : "badge-neutral"}`}>
            {intake.isOpen ? "Open" : "Closed"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by name, email, or student number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full"
          />
        </div>
        <div className="btn-group">
          <button
            onClick={() => setView("grid")}
            className={`btn-sm ${view === "grid" ? "btn-primary" : "btn-ghost"}`}
          >
            Grid
          </button>
          <button
            onClick={() => setView("table")}
            className={`btn-sm ${view === "table" ? "btn-primary" : "btn-ghost"}`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Roster */}
      {filteredEnrolments.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-gray-500 text-sm">
            {searchQuery ? "No students match your search." : "No students enrolled yet."}
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredEnrolments.map((enrolment) => (
            <div key={enrolment.id} className="card text-center hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 mx-auto mb-3 rounded-full bg-gray-200 overflow-hidden">
                {enrolment.user.avatarUrl ? (
                  <Image
                    src={enrolment.user.avatarUrl}
                    alt={enrolment.user.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-600">
                    {getInitials(enrolment.user.name)}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-sm mb-1">{enrolment.user.name}</h3>
              <p className="text-xs text-gray-500 mb-2 font-mono">
                {enrolment.user.studentNumber || "No reg #"}
              </p>
              <span className={`badge text-xs ${getStatusColor(enrolment.user.status)}`}>
                {enrolment.user.status.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Student</th>
                <th>Reg Number</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrolments.map((enrolment) => (
                <tr key={enrolment.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {enrolment.user.avatarUrl ? (
                          <Image
                            src={enrolment.user.avatarUrl}
                            alt={enrolment.user.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-600">
                            {getInitials(enrolment.user.name)}
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{enrolment.user.name}</span>
                    </div>
                  </td>
                  <td className="font-mono text-sm">
                    {enrolment.user.studentNumber || "—"}
                  </td>
                  <td className="text-sm">{enrolment.user.email || "—"}</td>
                  <td className="text-sm">{enrolment.user.phone || "—"}</td>
                  <td>
                    <span className={`badge text-xs ${getStatusColor(enrolment.user.status)}`}>
                      {enrolment.user.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="text-sm text-gray-500">
                    {format(new Date(enrolment.user.createdAt), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
