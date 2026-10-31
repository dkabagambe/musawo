import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Results - Instructor" };

export default async function TutorPage() {
  const session = await auth();
  if (!session?.user) redirect("/dashboard");
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Results</h1>
      </div>
      <div className="card py-16 text-center text-gray-400 text-sm">
        Coming soon.
      </div>
    </div>
  );
}
