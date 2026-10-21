import { notFound } from "next/navigation";
import Image from "next/image";
import DevLoginForm from "./DevLoginForm";

export const metadata = { title: "Demo Accounts - Dev Login" };

const DEMO_ACCOUNTS = [
  { label: "CEO / Super Admin",            email: "ceo@mtc.ac.ug",              role: "SUPER_ADMIN",        landing: "/director",    icon: "👑" },
  { label: "Deputy Director (Super Admin)",email: "deputy@mtc.ac.ug",           role: "SUPER_ADMIN",        landing: "/director",    icon: "👑" },
  { label: "Board Member",                 email: "board@mtc.ac.ug",            role: "BOARD_MEMBER",       landing: "/board",       icon: "🏛" },
  { label: "Board Member (Inst. Secretary)", email: "secretary@mtc.ac.ug",      role: "BOARD_MEMBER",       landing: "/board",       icon: "🏛" },
  { label: "Principal",            email: "principal@mtc.ac.ug",        role: "PRINCIPAL",          landing: "/principal",   icon: "🎓" },
  { label: "Deputy Principal",     email: "deputyprincipal@mtc.ac.ug",  role: "DEPUTY_PRINCIPAL",   landing: "/deputy",      icon: "🎓" },
  { label: "Academic Registrar",   email: "registrar@mtc.ac.ug",        role: "ACADEMIC_REGISTRAR", landing: "/registrar",   icon: "📋" },
  { label: "Finance Officer",      email: "finance@mtc.ac.ug",          role: "FINANCE_OFFICER",    landing: "/finance",     icon: "💳" },
  { label: "HR / System Admin",    email: "hr@mtc.ac.ug",               role: "HR_SYSTEM_ADMIN",    landing: "/admin",       icon: "👥" },
  { label: "Auditor (Read-only)",  email: "auditor@mtc.ac.ug",          role: "AUDITOR_READONLY",   landing: "/auditor",     icon: "🔍" },
  { label: "IT Admin",             email: "itadmin@mtc.ac.ug",          role: "SYSTEM_IT",          landing: "/system",      icon: "🖥" },
  { label: "Instructor",           email: "tutor@mtc.ac.ug",            role: "INSTRUCTOR",         landing: "/tutor",       icon: "👩" },
  { label: "Instructor 2",          email: "tutor2@mtc.ac.ug",           role: "INSTRUCTOR",         landing: "/tutor",       icon: "👩" },
  { label: "Teaching Assistant",   email: "assistant@mtc.ac.ug",        role: "TEACHING_ASSISTANT", landing: "/tutor",       icon: "🤝" },
  { label: "Student - new",        email: "student.new@example.com",    role: "STUDENT",            landing: "/dashboard",   icon: "📚" },
  { label: "Student - 25% paid",   email: "student.25@example.com",     role: "STUDENT",            landing: "/dashboard",   icon: "📚" },
  { label: "Student - 50% paid",   email: "student.50@example.com",     role: "STUDENT",            landing: "/dashboard",   icon: "📚" },
  { label: "Student - active",     email: "student.full@example.com",   role: "STUDENT",            landing: "/dashboard",   icon: "📚" },
  { label: "Student - overdue",    email: "student.overdue@example.com",role: "STUDENT",            landing: "/dashboard",   icon: "📚" },
  { label: "Student - completed",  email: "student.completed@example.com", role: "STUDENT",         landing: "/dashboard",   icon: "📚" },
  { label: "Student - pending invite", email: "student.waiting@example.com", role: "STUDENT",       landing: "invite only",  icon: "⏳" },
  { label: "Student - pending invite 2", email: "student.waiting2@example.com", role: "STUDENT",   landing: "invite only",  icon: "⏳" },
  { label: "Student - disputed",   email: "student.disputed@example.com", role: "STUDENT",          landing: "invite only",  icon: "⚠" },
];

const DEMO_PASSWORD = "Demo1234!";

export default function DevLoginPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Image src="/assets/logo-header.png" alt="MTC" width={40} height={40} className="rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-primary">Demo Login</h1>
            <p className="text-xs text-gray-500">Local development only - not available in production</p>
          </div>
        </div>

        <div className="card mb-4 p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>All accounts use password:</strong>{" "}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">{DEMO_PASSWORD}</code>
            {" "}Click any row to sign in instantly.
          </p>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Account</th>
                <th>Email</th>
                <th>Portal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {DEMO_ACCOUNTS.map((acct) => (
                <tr key={acct.email}>
                  <td>
                    <span className="mr-2" aria-hidden="true">{acct.icon}</span>
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
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <a href="/dev/mail" className="text-accent underline">Email preview (/dev/mail)</a>
        </p>
      </div>
    </div>
  );
}
