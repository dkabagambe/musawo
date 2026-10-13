import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      {/*
        pt-16 offsets the fixed header (h-16 = 64px) so no content is
        hidden behind it. The homepage hero section sits in normal flow
        below the header and manages its own internal spacing.
        pb-20 ensures the WhatsApp FAB never covers the last line of
        content on short pages.
      */}
      <main id="main" className="pt-16 pb-20">
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
