"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import AvatarOrInitials from "@/components/ui/AvatarOrInitials";
import MessageDrawer from "@/components/messaging/MessageDrawer";
import type { ConversationUser } from "@/components/messaging/ConversationPanel";

interface StudentRow {
  id: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    studentNumber: string | null;
    avatarUrl: string | null;
    role: string;
  };
}

interface GroupData {
  courseTitle: string;
  rows: StudentRow[];
}

interface Props {
  currentUserId: string;
  groups: GroupData[];
}

export default function TutorStudentsClient({ currentUserId, groups }: Props) {
  const [messagingUser, setMessagingUser] = useState<ConversationUser | null>(null);

  function openMessage(student: StudentRow["user"]) {
    setMessagingUser({
      id: student.id,
      name: student.name,
      role: student.role,
      avatarUrl: student.avatarUrl,
      studentNumber: student.studentNumber,
    });
  }

  return (
    <>
      {groups.map(({ courseTitle, rows }) => (
        <section
          key={courseTitle}
          className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface/50">
            <h2 className="font-bold text-primary">{courseTitle}</h2>
            <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              {rows.length} student{rows.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider">Student</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">
                    Student No.
                  </th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">
                    Contact
                  </th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">
                    Enrolled
                  </th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((enr) => (
                  <tr key={enr.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarOrInitials
                          name={enr.user.name}
                          avatarUrl={enr.user.avatarUrl}
                          size={32}
                        />
                        <span className="font-medium text-primary">{enr.user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="font-mono text-xs text-gray-500">
                        {enr.user.studentNumber ?? "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-xs text-gray-400">
                      {enr.user.email ?? enr.user.phone ?? "-"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          enr.status === "COMPLETED"
                            ? "bg-success/10 text-success"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {enr.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell text-xs text-gray-400">
                      {new Date(enr.createdAt).toLocaleDateString("en-UG")}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => openMessage(enr.user)}
                        className="btn-ghost flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors"
                        aria-label={`Message ${enr.user.name}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Message</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Message Drawer */}
      {messagingUser && (
        <MessageDrawer
          currentUserId={currentUserId}
          openWithUser={messagingUser}
          onClose={() => setMessagingUser(null)}
        />
      )}
    </>
  );
}
