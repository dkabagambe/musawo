import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Settings, FileSearch, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import StatCard from "@/components/ui/StatCard";

export const metadata = { title: "System IT Dashboard" };

const MASKED_KEYS = new Set([
  "payment.pesapalConsumerSecret", "payment.flutterwaveSecretKey",
  "video.bunnySigningKey", "storage.s3SecretKey",
  "email.resendApiKey", "sms.apiKey", "whatsapp.accessToken",
]);

const ACTION_LABELS: Record<string, string> = {
  SETTINGS_CHANGED: "Settings changed",
  LOGIN: "Login",
  LOGOUT: "Logout",
  TOTP_ENABLED: "2FA enabled",
  TOTP_DISABLED: "2FA disabled",
  BREAK_GLASS_GRANTED: "Break-glass granted",
  BREAK_GLASS_EXPIRED: "Break-glass expired",
};

export default async function SystemDashboardPage() {
  const session = await auth();
  if (!session?.user || !["SUPERADMIN", "SYSTEM_IT"].includes(session.user.role)) redirect("/login");

  const [settings, recentSystemLogs] = await Promise.all([
    db.siteSetting.findMany({ orderBy: { key: "asc" } }),
    db.auditLog.findMany({
      where: { action: { in: ["SETTINGS_CHANGED","LOGIN","LOGOUT","TOTP_ENABLED","TOTP_DISABLED","BREAK_GLASS_GRANTED","BREAK_GLASS_EXPIRED"] } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { actor: { select: { name: true, role: true } } },
    }),
  ]);

  const sensitiveCount = settings.filter((s) => MASKED_KEYS.has(s.key)).length;
  const configuredCount = settings.filter((s) => s.value && !s.value.startsWith("DEMO_")).length;

  // Group settings by prefix
  const grouped = settings.reduce<Record<string, typeof settings>>((acc, s) => {
    const group = s.key.split(".")[0];
    if (!acc[group]) acc[group] = [];
    acc[group].push(s);
    return acc;
  }, {});

  const GROUP_LABELS: Record<string, string> = {
    site: "Site", payment: "Payments", video: "Video", storage: "Storage",
    email: "Email", sms: "SMS", whatsapp: "WhatsApp", partner: "Partners",
    exam: "Exams", certificate: "Certificates", intake: "Intakes", course: "Courses",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">System Overview</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Config Keys"        value={settings.length}    icon={<Settings className="w-5 h-5" />}      href="/system/settings" color="primary" />
        <StatCard label="Configured (live)"  value={configuredCount}    icon={<CheckCircle2 className="w-5 h-5" />}  color="success" />
        <StatCard label="Sensitive Keys"     value={sensitiveCount}     icon={<AlertCircle className="w-5 h-5" />}   color="warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Config overview */}
        <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-bold text-primary">Configuration Groups</h2>
            <Link href="/system/settings" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              Edit settings <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {Object.entries(grouped).map(([group, items]) => {
              const hasSensitive = items.some((i) => MASKED_KEYS.has(i.key));
              const allConfigured = items.every((i) => i.value);
              return (
                <div key={group} className="flex items-center gap-3 px-5 py-3 hover:bg-surface/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${allConfigured ? "bg-success" : "bg-warning"}`} />
                  <span className="text-sm font-medium text-primary capitalize flex-1">
                    {GROUP_LABELS[group] ?? group}
                  </span>
                  <span className="text-xs text-gray-400">{items.length} key{items.length !== 1 ? "s" : ""}</span>
                  {hasSensitive && (
                    <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded">SECRET</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* System event log */}
        <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-bold text-primary">Recent System Events</h2>
            <Link href="/system/audit" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
              Full log <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentSystemLogs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-400 text-sm">No system events recorded.</p>
              </div>
            ) : recentSystemLogs.map((log) => {
              const isSettings = log.action === "SETTINGS_CHANGED";
              return (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSettings ? "bg-warning/10" : "bg-primary/10"}`}>
                    {isSettings
                      ? <Settings className="w-3.5 h-3.5 text-amber-600" />
                      : <FileSearch className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary">
                      {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{log.actor?.name ?? "System"}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(log.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short" })}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: "/system/settings", label: "Edit Settings", icon: "⚙️", desc: "Update platform config" },
          { href: "/system/audit",    label: "System Logs",   icon: "📋", desc: "View all system events" },
          { href: "/admin",           label: "Administration",icon: "🏥", desc: "Registrar admin panel" },
        ].map((l) => (
          <Link key={l.href} href={l.href}
            className="bg-white rounded-2xl border border-border p-5 no-underline hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
            <span className="text-2xl block mb-2">{l.icon}</span>
            <p className="font-semibold text-sm text-primary">{l.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
