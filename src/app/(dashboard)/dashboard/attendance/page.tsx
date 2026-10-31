import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Attendance - Student" };

export default async function StudentAttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your attendance record across all classes</p>
      </div>
      <div className="card py-16 text-center text-gray-400 text-sm">
        Attendance record coming soon.
      </div>
    </div>
  );
}
