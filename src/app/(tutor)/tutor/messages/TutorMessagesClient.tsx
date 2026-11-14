"use client";

import { useState } from "react";
import ConversationPanel from "@/components/messaging/ConversationPanel";
import BroadcastForm from "@/components/messaging/BroadcastForm";
import { Megaphone } from "lucide-react";

interface Props {
  currentUserId: string;
}

export default function TutorMessagesClient({ currentUserId }: Props) {
  const [showBroadcast, setShowBroadcast] = useState(false);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Broadcast message toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowBroadcast((v) => !v)}
          className="btn-ghost flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/10 px-3 py-2 rounded-lg"
          aria-expanded={showBroadcast}
        >
          <Megaphone className="w-4 h-4" />
          {showBroadcast ? "Hide broadcast form" : "Message a whole class or course"}
        </button>
      </div>

      {showBroadcast && (
        <BroadcastForm onSent={() => setShowBroadcast(false)} />
      )}

      <div className="flex-1 min-h-0">
        <ConversationPanel
          currentUserId={currentUserId}
          fullPage={true}
        />
      </div>
    </div>
  );
}
