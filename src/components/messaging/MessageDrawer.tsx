"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import ConversationPanel from "./ConversationPanel";
import type { ConversationUser } from "./ConversationPanel";

interface MessageDrawerProps {
  currentUserId: string;
  openWithUser?: ConversationUser | null;
  onClose: () => void;
}

/**
 * Mobile/desktop message drawer.
 * On desktop: a side panel overlaid on the right side of the viewport.
 * On mobile: a bottom sheet.
 */
export default function MessageDrawer({
  currentUserId,
  openWithUser,
  onClose,
}: MessageDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent body scroll while drawer is open
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="fixed bottom-0 right-0 z-50 flex flex-col
          w-full max-w-[420px] h-[90vh] md:h-full md:max-h-screen
          shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Messages"
      >
        <ConversationPanel
          currentUserId={currentUserId}
          openWithUser={openWithUser}
          fullPage={false}
          onClose={onClose}
        />
      </div>
    </>,
    document.body,
  );
}
