import { db } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
import AdminSettingsForm from "./SettingsForm";

export const metadata = { title: "Site Settings" };

export default async function SettingsPage() {
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

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-2">Site Settings</h1>
      <p className="text-gray-500 text-sm mb-6">
        All settings are stored in the database and take effect immediately.
        Sensitive keys (API keys, secrets) should be set here rather than in
        environment variables so they can be updated without redeploy.
      </p>

      <AdminSettingsForm groups={GROUPS} currentSettings={settings} />
    </div>
  );
}
