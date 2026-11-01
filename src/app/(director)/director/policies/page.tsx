import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import PoliciesEditor from "./PoliciesEditor";

export const metadata = { title: "Policies & Settings - Director" };

const POLICY_KEYS = [
  { key: "policy.requireAdmissionApproval",  label: "Require Principal approval for admissions", type: "bool", default: "true" },
  { key: "policy.paymentPhase1Percent",       label: "Phase 1 payment % (before reporting, unlocks course)", type: "number", default: "50" },
  { key: "policy.paymentPhase2Percent",       label: "Phase 2 payment % (unlocks next block + practicals)", type: "number", default: "75" },
  { key: "policy.paymentPhase3Percent",       label: "Phase 3 payment % (unlocks final exam + certificate)", type: "number", default: "100" },
  { key: "policy.usdRateUgx",                 label: "USD to UGX exchange rate (for international fees)", type: "number", default: "3600" },
  { key: "policy.bankPaymentsEnabled",        label: "Enable bank transfer payment option (public)", type: "bool", default: "false" },
  { key: "policy.mtnMomoMerchantCode",        label: "MTN MoMo merchant code", type: "text", default: "" },
  { key: "policy.airtelMoneyMerchantCode",    label: "Airtel Money merchant code", type: "text", default: "" },
  { key: "policy.storageRetentionDays",       label: "Storage retention (days, after intake ends)", type: "number", default: "120" },
  { key: "feature.ACADEMIC_REGISTRAR_ACTIVE", label: "Academic Registrar portal active", type: "bool", default: "false" },
  { key: "approval.maxSuperAdminAccounts",    label: "Max Director accounts", type: "number", default: "2" },
] as const;

export default async function DirectorPoliciesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "approvals.settings.edit")) redirect("/login");

  const saved = await db.siteSetting.findMany({
    where: { key: { in: POLICY_KEYS.map((p) => p.key) } },
  });
  const savedMap = Object.fromEntries(saved.map((s) => [s.key, s.value]));

  const policies = POLICY_KEYS.map((p) => ({
    ...p,
    value: savedMap[p.key] ?? p.default,
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Policies & Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Institution-wide policy settings. Changes take effect immediately.</p>
      </div>
      <PoliciesEditor policies={policies} />
    </div>
  );
}
