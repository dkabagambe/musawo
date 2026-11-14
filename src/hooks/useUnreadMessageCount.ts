"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Polls /api/conversations/unread-count every 10 seconds.
 * Returns the unread conversation count for the current user.
 */
export function useUnreadMessageCount() {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations/unread-count");
      if (res.ok) {
        const data = await res.json();
        setCount(data.count ?? 0);
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCount]);

  return count;
}
