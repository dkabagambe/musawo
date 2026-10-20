import { db } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
import AdminSettingsForm from "./SettingsForm";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const metadata = { title: "Site Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "settings.view")) redirect("/403");
  const settings = await getAllSettings();
  await db.siteSetting.findMany({
    orderBy: { key: "asc" },
  });

  const GROUPS = [
    {
      label: "Site",
      prefix: "site.",
      keys: [
        "site.name",
        "site.domain",
        "site.url",
        "site.supportEmail",
        "site.supportPhone",
        "site.accreditationText",
      ],
    },
    {
      label: "Course defaults",
      prefix: "course.",
      keys: ["course.freePreviewPercent"],
    },
    {
      label: "Role labels and hierarchy",
      prefix: "role.label.",
      keys: [
        "role.label.SUPER_ADMIN", "role.label.BOARD_MEMBER", "role.label.PRINCIPAL",
        "role.label.DEPUTY_PRINCIPAL", "role.label.ACADEMIC_REGISTRAR", "role.label.INSTRUCTOR",
        "role.label.TEACHING_ASSISTANT", "role.label.FINANCE_OFFICER", "role.label.HR_SYSTEM_ADMIN",
        "role.label.AUDITOR_READONLY", "role.label.SYSTEM_IT", "role.label.STUDENT",
      ],
    },
    {
      label: "Payments",
      prefix: "payment.",
      keys: [
        "payment.gateway",
        "payment.currency",
        "payment.pesapalConsumerKey",
        "payment.pesapalConsumerSecret",
        "payment.pesapalCallbackUrl",
        "payment.flutterwaveSecretKey",
      ],
    },
    {
      label: "Video (Bunny Stream)",
      prefix: "video.",
      keys: [
        "video.bunnyStreamApiKey",
        "video.bunnyLibraryId",
        "video.bunnySigningKey",
      ],
    },
    {
      label: "Storage (S3)",
      prefix: "storage.",
      keys: [
        "storage.s3Endpoint",
        "storage.s3Bucket",
        "storage.s3AccessKey",
        "storage.s3SecretKey",
      ],
    },
    {
      label: "Email",
      prefix: "email.",
      keys: ["email.resendApiKey"],
    },
    {
      label: "SMS",
      prefix: "sms.",
      keys: ["sms.provider", "sms.apiKey", "sms.senderId"],
    },
    {
      label: "WhatsApp (Phase 2)",
      prefix: "whatsapp.",
      keys: ["whatsapp.accessToken", "whatsapp.phoneNumberId"],
    },
    {
      label: "Exams",
      prefix: "exam.",
      keys: ["exam.tabSwitchAlertThreshold", "exam.defaultAttemptLimit"],
    },
    {
      label: "Certificates",
      prefix: "certificate.",
      keys: ["certificate.issuerName"],
    },
    {
      label: "Partner pages",
      prefix: "partner.",
      keys: ["partner.defaultName"],
    },
  ];

  const publicKeys = new Set([
    "site.name", "site.domain", "site.url", "site.websiteUrl", "site.supportEmail", "site.admissionsEmail",
    "site.supportPhone", "site.supportPhone2", "site.whatsappNumber", "site.address", "site.mapLat", "site.mapLng",
    "site.tagline", "site.intakeEyebrow", "site.accreditationText", "intake.currentLabel", "site.flyerKey", "course.feeDisplay",
  ]);
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    keys: group.keys.filter((key) =>
      (!publicKeys.has(key) || can(session.user.role, "settings.edit.public")) &&
      (!/secret|token|apiKey|AccessKey|password|privateKey/i.test(key) || can(session.user.role, "settings.edit.secrets"))
    ),
  })).filter((group) => group.keys.length > 0);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-2">Site Settings</h1>
      <p className="text-gray-500 text-sm mb-6">
        All settings are stored in the database and take effect immediately.
        Sensitive keys (API keys, secrets) should be set here rather than in
        environment variables so they can be updated without redeploy.
      </p>

      <AdminSettingsForm groups={visibleGroups} currentSettings={settings} />
    </div>
  );
}
