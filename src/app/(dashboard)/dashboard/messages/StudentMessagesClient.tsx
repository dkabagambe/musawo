"use client";

import ConversationPanel from "@/components/messaging/ConversationPanel";

interface Props {
  currentUserId: string;
}

export default function StudentMessagesClient({ currentUserId }: Props) {
  return (
    <ConversationPanel
      currentUserId={currentUserId}
      fullPage={true}
    />
  );
}
