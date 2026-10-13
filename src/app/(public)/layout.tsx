import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      {/*
        pt-0 — homepage hero uses -mt-16 for full bleed.
        pb-20 — ensures the WhatsApp FAB (bottom-4 = 16px, 52px tall) never
                 covers the last line of content on short pages.
      */}
      <main id="main" className="pb-20">
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
