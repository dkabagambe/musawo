import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import DevLoginForm from "./DevLoginForm";

export const metadata = { title: "Demo Accounts - Dev Login" };

const DEMO_ACCOUNTS = [
  { label: "CEO / Director",  email: "ceo@musawotraining.ug",        role: "SUPERADMIN", landing: "/director",        icon: "👑" },
  { label: "Deputy Director", email: "deputy@musawotraining.ug",     role: "SUPERADMIN", landing: "/director",        icon: "👑" },
  { label: "IT Admin",        email: "itadmin@musawotraining.ug",    role: "SYSTEM_IT",  landing: "/system",          icon: "🖥️" },
  { label: "Registrar",       email: "registrar@musawotraining.ug",  role: "REGISTRAR",  landing: "/admin/students",  icon: "📋" },
  { label: "Bursar",          email: "bursar@musawotraining.ug",     role: "BURSAR",     landing: "/bursar",          icon: "💳" },
  { label: "Tutor (Grace)",   email: "tutor@musawotraining.ug",      role: "TUTOR",      landing: "/tutor",           icon: "👩‍🏫" },
  { label: "Tutor 2 (dual)",  email: "tutor2@musawotraining.ug",     role: "TUTOR",      landing: "/tutor",           icon: "👩‍🏫" },
  { label: "Student — new",      email: "student.new@example.com",       role: "STUDENT", landing: "/dashboard", icon: "🎓" },
  { label: "Student — 25% paid", email: "student.25@example.com",        role: "STUDENT", landing: "/dashboard", icon: "🎓" },
  { label: "Student — 50% paid", email: "student.50@example.com",        role: "STUDENT", landing: "/dashboard", icon: "🎓" },
  { label: "Student — active",   email: "student.full@example.com",      role: "STUDENT", landing: "/dashboard", icon: "🎓" },
  { label: "Student — overdue",  email: "student.overdue@example.com",   role: "STUDENT", landing: "/dashboard", icon: "🎓" },
  { label: "Student — sponsored",email: "student.sponsored@example.com", role: "STUDENT", landing: "/dashboard", icon: "🎓" },
  { label: "Student — completed",email: "student.completed@example.com", role: "STUDENT", landing: "/dashboard", icon: "🎓" },
];

export const DEMO_PASSWORD = "Demo1234!";

export default function DevLoginPage() {
  // 404 in production
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Image src="/assets/logo-header.png" alt="MTC" width={40} height={40} className="rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-primary">Demo Login</h1>
            <p className="text-xs text-gray-500">Local development only — not available in production</p>
          </div>
        </div>

        <div className="card mb-4 p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>All accounts use password:</strong>{" "}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">{DEMO_PASSWORD}</code>
            {" "}· Click any row to sign in instantly.
          </p>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Role</th>
                <th>Email</th>
                <th>Lands on</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {DEMO_ACCOUNTS.map((acct) => (
                <tr key={acct.email}>
                  <td>
                    <span className="mr-2">{acct.icon}</span>
                    <span className="font-medium">{acct.label}</span>
                    <span className="ml-2 badge badge-neutral text-xs">{acct.role}</span>
                  </td>
                  <td className="font-mono text-xs text-gray-600">{acct.email}</td>
                  <td className="text-xs text-gray-500">{acct.landing}</td>
                  <td>
                    <DevLoginForm email={acct.email} password={DEMO_PASSWORD} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          This page is only shown when <code>NODE_ENV !== &quot;production&quot;</code>.
          See <code>docs/DEMO.md</code> for the presentation walkthrough.
        </p>
      </div>
    </div>
  );
}
