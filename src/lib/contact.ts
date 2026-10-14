/**
 * Contact details helper - reads from SiteSettings with fallbacks.
 * Used in layout, footer, emails, certificates, etc.
 * Admin can override any value via /admin/settings.
 */

import { getSetting } from "@/lib/settings";

export interface ContactInfo {
  email: string;
  phone: string;
  whatsappNumber: string; // digits only, e.g. "256785423523"
  whatsappUrl: string;
  address: string;
  instagramUrl: string;
  tiktokUrl: string;
  tagline: string;
}

export async function getContactInfo(): Promise<ContactInfo> {
  const [email, phone, whatsappNumber, address, instagramUrl, tiktokUrl, tagline] =
    await Promise.all([
      getSetting("site.supportEmail", "info@musawo.ug"),
      getSetting("site.supportPhone", "+256 785 423 523"),
      getSetting("site.whatsappNumber", "256785423523"),
      getSetting("site.address", "Plot 5, ADFA Building, Zone 8 Lungujja, Kampala, Uganda"),
      getSetting("site.instagramUrl", "https://www.instagram.com/musawotm"),
      getSetting("site.tiktokUrl", "https://www.tiktok.com/@musawoadfa"),
      getSetting(
        "site.tagline",
        "Bringing quality healthcare to Ugandan homes and communities since 2018 through testing, treatment, training and trust."
      ),
    ]);

  return {
    email,
    phone,
    whatsappNumber,
    whatsappUrl: `https://wa.me/${whatsappNumber}`,
    address,
    instagramUrl,
    tiktokUrl,
    tagline,
  };
}
