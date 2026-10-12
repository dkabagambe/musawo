import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "System IT Dashboard" };

export default async function SystemDashboardPage() {
  const session = await auth();
  if (!session?.user || !["SUPERADMIN","SYSTEM_IT"].includes(session.user.role)) redirect("/login");

  // System IT sees no student personal or payment data
  const recentSystemLogs = await db.auditLog.findMany({
    where: {
      action: { in: ["SETTINGS_CHANGED","LOGIN","LOGOUT","TOTP_ENABLED","TOTP_DISABLED","BREAK_GLASS_GRANTED","BREAK_GLASS_EXPIRED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: { select: { name: true, role: true } } },
  });

  const settings = await db.siteSetting.findMany({ orderBy: { key: "asc" } });

  // Mask sensitive keys
  const MASKED_KEYS = new Set([
    "payment.pesapalConsumerSecret","payment.flutterwaveSecretKey",
    "video.bunnySigningKey","storage.s3SecretKey","email.resendApiKey","sms.apiKey",
    "whatsapp.accessToken",
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6">System Overview</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-3xl mb-1" aria-hidden="true">⚙️</p>
          <p className="text-xl font-bold text-primary">{settings.length}</p>
          <p className="text-xs text-gray-500 mt-1">Config keys</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl mb-1" aria-hidden="true">📋</p>
          <p className="text-xl font-bold text-primary">{recentSystemLogs.length}</p>
          <p className="text-xs text-gray-500 mt-1">Recent system events</p>
        </div>
        <Link href="/system/settings" className="card text-center no-underline hover:shadow-md transition-shadow">
          <p className="text-3xl mb-1" aria-hidden="true">🔧</p>
          <p className="text-sm font-semibold text-primary">Manage settings</p>
        </Link>
      </div>

      {/* Masked settings table */}
      <div className="card overflow-x-auto mb-6">
        <h2 className="font-semibold mb-3">Site configuration</h2>
        <p className="text-xs text-gray-400 mb-3">Secret values are masked. Edit in Settings.</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Key</th>
              <th className="pb-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {settings.map((s) => (
              <tr key={s.id}>
                <td className="py-1.5 pr-4 font-mono text-xs text-gray-600">{s.key}</td>
                <td className="py-1.5 text-xs">
                  {MASKED_KEYS.has(s.key)
                    ? <span className="font-mono text-gray-400">{"•".repeat(12)}</span>
                    : <span className="font-mono">{s.value || <span className="text-gray-300 italic">empty</span>}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent system events */}
      <div className="card">
        <h2 className="font-semibold mb-3">Recent system events</h2>
        <div className="space-y-2">
          {recentSystemLogs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 text-sm">
              <span className="badge badge-info text-xs">{log.action.replace(/_/g," ")}</span>
              <span className="text-gray-600">{log.actor?.name ?? "System"}</span>
              <span className="text-gray-400 text-xs ml-auto">{new Date(log.createdAt).toLocaleString("en-UG")}</span>
            </div>
          ))}
        </div>
        <Link href="/system/audit" className="text-xs text-accent no-underline hover:underline mt-3 inline-block">
          View all logs →
        </Link>
      </div>
    </div>
  );
}
