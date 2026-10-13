import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      {/*
        pt-16 offsets the fixed header (h-16 = 64px) so no content is
        hidden behind it. flex-1 makes <main> grow to fill available
        space so the footer is always pushed to the bottom on short pages.
        No pb-* here — the WhatsApp FAB clearance is handled inside the
        footer itself (pb-20 on mobile in the footer's bottom bar).
      */}
      <main id="main" className="pt-16 flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
