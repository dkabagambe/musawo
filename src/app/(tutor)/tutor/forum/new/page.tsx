"use client";

/**
 * Tutor forum new-thread page — reuses the student new-thread form.
 * The /api/forum GET is role-aware and returns only the tutor's assigned courses.
 * After submission, redirects back to /tutor/forum.
 */
import { Suspense } from "react";
import NewForumThreadInner from "@/app/(dashboard)/dashboard/forum/new/page";

export default function TutorNewForumThreadPage() {
  return (
    <Suspense>
      <NewForumThreadInner />
    </Suspense>
  );
}
