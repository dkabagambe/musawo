"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * ThemeSync
 *
 * Applies the user's DB-stored theme preference (light, dark, or system)
 * to next-themes on mount. This makes the database the source of truth so
 * the chosen theme follows the user across devices, logout/login and
 * server restarts, not just the browser's localStorage.
 *
 * Place once inside the dashboard layout. Because Next.js keeps the layout
 * mounted across page navigations, this effect runs only on first load.
 */
export function ThemeSync({ initialTheme }: { initialTheme: string }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    const theme = initialTheme || "system";
    setTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
