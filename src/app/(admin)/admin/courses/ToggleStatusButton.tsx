"use client";

interface Props {
  courseId:      string;
  currentStatus: string;
}

export default function ToggleStatusButton({ courseId, currentStatus }: Props) {
  const nextStatus = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
  const label      = currentStatus === "PUBLISHED" ? "Unpublish" : "Publish";

  async function handleClick() {
    await fetch(`/api/admin/courses/${courseId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: nextStatus }),
    });
    // Reload to reflect the new status
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-xs hover:underline bg-transparent border-none p-0 cursor-pointer ${
        currentStatus === "PUBLISHED" ? "text-danger" : "text-success"
      }`}
    >
      {label}
    </button>
  );
}
