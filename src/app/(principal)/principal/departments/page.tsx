import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

export const metadata = { title: "Departments - Principal" };

const DEPARTMENTS = [
  {
    name: "Home Care",
    description: "Courses covering home-based patient care, caregiver skills and patient support.",
  },
  {
    name: "Child Care and Safety",
    description: "Child development, safeguarding, early childhood education and nutrition.",
  },
  {
    name: "Mental Health",
    description: "Psychosocial support, counselling fundamentals and community mental health.",
  },
  {
    name: "Emergency and Life Support",
    description: "First aid, basic life support, emergency response and triage procedures.",
  },
];

export default async function PrincipalDepartmentsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/403");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Departments</h1>
        <p className="text-sm text-gray-500 mt-1">Academic departments at Musawo Training Center</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {DEPARTMENTS.map((d) => (
          <div key={d.name} className="card">
            <h2 className="font-semibold text-base mb-1">{d.name}</h2>
            <p className="text-sm text-gray-500">{d.description}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Departments are editable placeholders. Contact IT Admin to add or modify departments.
      </p>
    </div>
  );
}
