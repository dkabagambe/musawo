import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";
import { LazyMotion, domAnimation } from "framer-motion";

// Public marketing pages are mostly static — let Next.js cache/ISR them.
// Individual pages that read from the DB export their own `revalidate`.
// The old force-dynamic here prevented ALL caching on every public route.
export const dynamic = "auto";

/**
 * Header is fixed and consists of:
 *   - Main bar: 72px (all breakpoints)
 *
 * pt-[72px] shifts content below the fixed header at all sizes.
 * The homepage hero uses 100svh minus 72px internally so it fills
 * exactly the visible viewport.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main id="main" style={{ paddingTop: "calc(var(--banner-h, 0px) + 72px)" }} className="flex-1">
          {children}
        </main>
        <PublicFooter />
      </div>
    </LazyMotion>
  );
}
