import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";
import { getSetting } from "@/lib/settings";

/**
 * Header is fixed and consists of:
 *   - Utility bar: 38 px (lg+ only)
 *   - Main bar:    72 px (always)
 *   Total: 72 px mobile/tablet | 110 px desktop (lg+)
 *
 * pt-[72px] / lg:pt-[110px] shifts content below the fixed header.
 * The homepage hero uses 100svh minus the header height internally,
 * so it fills exactly the visible viewport.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const accreditationText = await getSetting("site.accreditationText", "");

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader showAccreditation={!!accreditationText} />
      <main id="main" className="pt-[72px] lg:pt-[110px] flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
