"use client";

import React from "react";

// ─── Badge ──────────────────────────────────────────────────────────────────

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "info" | "success" | "warning" | "danger";
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variantClass =
    variant === "info"    ? "badge-info" :
    variant === "success" ? "badge-success" :
    variant === "warning" ? "badge-warning" :
    variant === "danger"  ? "badge-danger" :
    "badge";

  return React.createElement(
    "span",
    { className: `badge ${variantClass} ${className}`.trim() },
    children
  );
}

// ─── Spinner ────────────────────────────────────────────────────────────────

export function Spinner({ className = "" }: { className?: string }) {
  return React.createElement(
    "div",
    {
      className: `inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`,
      role: "status",
      "aria-label": "Loading",
    }
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "📭", title, message, action }: EmptyStateProps) {
  return React.createElement(
    "div",
    { className: "card text-center py-12" },
    React.createElement("p", { className: "text-4xl mb-3", "aria-hidden": "true" }, icon),
    React.createElement("p", { className: "font-semibold text-gray-700 mb-1" }, title),
    message &&
      React.createElement("p", { className: "text-sm text-gray-400 mb-4 max-w-xs mx-auto" }, message),
    action && React.createElement("div", { className: "mt-4" }, action)
  );
}

// ─── ErrorMessage ────────────────────────────────────────────────────────────

export interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return React.createElement(
    "div",
    {
      className: "text-danger text-sm bg-danger/10 rounded-xl px-4 py-3",
      role: "alert",
    },
    message
  );
}
