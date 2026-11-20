/**
 * Contact details helper - reads from SiteSettings with fallbacks.
 * Used in layout, footer, emails, certificates, etc.
 * Admin can override any value via /admin/settings.
 */

import { getSetting } from "@/lib/settings";

export interface ContactInfo {
  email: string;
  phone: string;
  phone3: string;
  admissionsEmail: string;
  whatsappNumber: string; // digits only, e.g. "256709184468"
  whatsappUrl: string;
  address: string;
  instagramUrl: string;
  tiktokUrl: string;
  twitterUrl: string;
  tagline: string;
  websiteUrl: string;
}

export async function getContactInfo(): Promise<ContactInfo> {
  const [
    email, admissionsEmail, phone, phone3, whatsappNumber,
    address, instagramUrl, tiktokUrl, twitterUrl, tagline, websiteUrl,
  ] = await Promise.all([
    getSetting("site.supportEmail",    "info@mtc.ac.ug"),
    getSetting("site.admissionsEmail", "admissions@mtc.ac.ug"),
    getSetting("site.supportPhone",    "+256709184468"),
    getSetting("site.supportPhone3",   ""),
    getSetting("site.whatsappNumber",  "256709184468"),
    getSetting(
      "site.address",
      "Lugala Trading Center, Lubaga Division, Kampala (near Pr. Namutebi's Church)"
    ),
    getSetting("site.instagramUrl", "https://www.instagram.com/musawotm"),
    getSetting("site.tiktokUrl",    "https://www.tiktok.com/@mtc.trainingcenter"),
    getSetting("site.twitterUrl",   "https://x.com/MTCKampala"),
    getSetting("site.tagline",      "Learn · Serve · Transform"),
    getSetting("site.websiteUrl",   "www.musawo.ug"),
  ]);

  return {
    email,
    admissionsEmail,
    phone,
    phone3,
    whatsappNumber,
    whatsappUrl: `https://wa.me/${whatsappNumber}`,
    address,
    instagramUrl,
    tiktokUrl,
    twitterUrl,
    tagline,
    websiteUrl,
  };
}
