import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Settings - System IT" };

export default async function SystemSettingsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "settings.view") && !can(session.user.role, "settings.edit")) redirect("/login");

  const settings = await db.siteSetting.findMany({ orderBy: { key: "asc" } });

  // Group by prefix
  const grouped: Record<string, typeof settings> = {};
  for (const s of settings) {
    const prefix = s.key.split(".")[0];
    if (!grouped[prefix]) grouped[prefix] = [];
    grouped[prefix].push(s);
  }

  const MASKED_KEYS = new Set([
    "payment.pesapalConsumerSecret","payment.flutterwaveSecretKey",
    "video.bunnySigningKey","storage.s3SecretKey","email.resendApiKey",
    "sms.apiKey","whatsapp.accessToken",
  ]);

  // SYSTEM_IT can only edit infra/integration keys, NOT payment amounts or academic settings
  const SYSTEM_IT_EDITABLE_PREFIXES = new Set(["storage","video","email","sms","whatsapp","site"]);
  const canEditKey = (key: string) => {
    if (can(session.user.role, "settings.edit.secrets")) return true;
    const prefix = key.split(".")[0];
    return SYSTEM_IT_EDITABLE_PREFIXES.has(prefix) && can(session.user.role, "settings.edit");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-2">Site Settings</h1>
      <p className="text-xs text-gray-400 mb-6">
        Secret values are masked. Click Edit to update a value.
        Payment and exam settings require SUPER_ADMIN.
      </p>

      {Object.entries(grouped).map(([prefix, keys]) => (
        <section key={prefix} className="card mb-6">
          <h2 className="font-semibold capitalize mb-4">{prefix}</h2>
          <div className="space-y-3">
            {keys.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-gray-500">{s.key}</p>
                  <p className="text-sm mt-0.5">
                    {MASKED_KEYS.has(s.key)
                      ? <span className="font-mono text-gray-400">{"•".repeat(16)}</span>
                      : <span className="font-mono">{s.value || <span className="text-gray-300 italic">empty</span>}</span>}
                  </p>
                </div>
                {canEditKey(s.key) && (
                  <form action="/api/settings" method="POST" className="flex items-center gap-2">
                    <input type="hidden" name="key" value={s.key} />
                    <input
                      type={MASKED_KEYS.has(s.key) ? "password" : "text"}
                      name="value"
                      defaultValue={MASKED_KEYS.has(s.key) ? "" : s.value}
                      placeholder={MASKED_KEYS.has(s.key) ? "New value…" : undefined}
                      className="input text-xs w-48"
                    />
                    <button type="submit" className="btn-primary text-xs px-3 py-1.5">Save</button>
                  </form>
                )}
                {!canEditKey(s.key) && (
                  <span className="text-xs text-gray-400 italic">SUPER_ADMIN only</span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
