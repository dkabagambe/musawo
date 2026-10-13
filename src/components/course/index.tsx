"use client";

import React, { useState } from "react";
import Link from "next/link";

// ─── CourseCard ───────────────────────────────────────────────────────────────

export interface CourseCardProps {
  title: string;
  tutorName: string;
  durationWeeks?: number | null;
  fullFeeUgx: number;
  thumbnailUrl?: string | null;
  slug: string;
  enrolled?: boolean;
}

export function CourseCard({
  title,
  tutorName,
  durationWeeks,
  fullFeeUgx,
  thumbnailUrl,
  slug,
  enrolled = false,
}: CourseCardProps) {
  const href = enrolled ? `/dashboard/courses/${slug}` : `/courses/${slug}`;

  return (
    <Link href={href} className="card no-underline hover:shadow-md transition-shadow block group">
      {/* Thumbnail */}
      <div className="rounded-xl overflow-hidden bg-primary/5 mb-4" style={{ aspectRatio: "16/9" }}>
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl" aria-hidden="true">
            🏥
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        {enrolled && (
          <span className="badge badge-success text-xs mb-2 inline-block">Enrolled</span>
        )}
        <h3 className="font-semibold text-sm leading-snug mb-1 group-hover:text-accent transition-colors">
          {title}
        </h3>
        <p className="text-xs text-gray-400 mb-3">{tutorName}</p>

        <div className="flex items-center justify-between text-xs text-gray-500">
          {durationWeeks != null ? (
            <span>⏱ {durationWeeks} weeks</span>
          ) : (
            <span />
          )}
          <span className="font-semibold text-primary">
            UGX {fullFeeUgx.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  percent: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ percent, label, className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={className}>
      {label !== undefined && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div
        className="h-2 bg-border rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `${clamped}% complete`}
      >
        <div
          className="h-full bg-success rounded-full transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// ─── BlockAccordion ───────────────────────────────────────────────────────────

export interface BlockAccordionProps {
  title: string;
  order: number;
  locked?: boolean;
  completed?: boolean;
  children: React.ReactNode;
}

export function BlockAccordion({
  title,
  order,
  locked = false,
  completed = false,
  children,
}: BlockAccordionProps) {
  const [open, setOpen] = useState(!locked);

  return (
    <div className="border border-border rounded-2xl overflow-hidden mb-3">
      <button
        type="button"
        onClick={() => !locked && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left font-medium text-sm transition-colors
          ${locked ? "cursor-not-allowed opacity-60 bg-surface" : "hover:bg-surface bg-white"}`}
        aria-expanded={open}
        aria-disabled={locked}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true">
            {locked ? "🔒" : completed ? "✅" : `📚`}
          </span>
          <span>
            Block {order}: {title}
          </span>
        </span>
        {!locked && (
          <span
            aria-hidden="true"
            className="text-gray-400 transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▾
          </span>
        )}
      </button>

      {open && !locked && (
        <div className="px-4 py-3 border-t border-border bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
