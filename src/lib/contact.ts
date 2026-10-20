/**
 * Contact details helper - reads from SiteSettings with fallbacks.
 * Used in layout, footer, emails, certificates, etc.
 * Admin can override any value via /admin/settings.
 */

import { getSetting } from "@/lib/settings";

export interface ContactInfo {
  email: string;
  phone: string;
  phone2: string;
  admissionsEmail: string;
  whatsappNumber: string; // digits only, e.g. "256709184468"
  whatsappUrl: string;
  address: string;
  instagramUrl: string;
  tiktokUrl: string;
  tagline: string;
  websiteUrl: string;
}

export async function getContactInfo(): Promise<ContactInfo> {
  const [
    email, admissionsEmail, phone, phone2, whatsappNumber,
    address, instagramUrl, tiktokUrl, tagline, websiteUrl,
  ] = await Promise.all([
    getSetting("site.supportEmail",    "info@musawo.ug"),
    getSetting("site.admissionsEmail", "admissions@musawo.ug"),
    getSetting("site.supportPhone",    "0709 184 468"),
    getSetting("site.supportPhone2",   "0790 192 270"),
    getSetting("site.whatsappNumber",  "256709184468"),
    getSetting(
      "site.address",
      "Luggala Trading Center, Lubaga Division, Kampala (near Pr. Namutebi's Church)"
    ),
    getSetting("site.instagramUrl", "https://www.instagram.com/musawotm"),
    getSetting("site.tiktokUrl",    "https://www.tiktok.com/@musawoadfa"),
    getSetting("site.tagline",      "Learn · Serve · Transform"),
    getSetting("site.websiteUrl",   "www.musawo.ug"),
  ]);

  return {
    email,
    admissionsEmail,
    phone,
    phone2,
    whatsappNumber,
    whatsappUrl: `https://wa.me/${whatsappNumber}`,
    address,
    instagramUrl,
    tiktokUrl,
    tagline,
    websiteUrl,
  };
}
