import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";

interface ContactBandProps {
  whatsappUrl?: string;
}

/**
 * "Need more information?" band.
 * Two cards: "Send us a message" (links to /contact) and
 * "Call or WhatsApp us".
 */
export default function ContactBand({
  whatsappUrl = "https://wa.me/256785423523",
}: ContactBandProps) {
  return (
    <section
      className="bg-[#F1F7F5] py-12 sm:py-16 px-4 sm:px-6"
      aria-label="Contact information"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-10">
          <p className="section-eyebrow">Get in touch</p>
          <h2
            className="mt-2 font-bold text-balance"
            style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}
          >
            Need more information?
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Send a message */}
          <Link
            href="/contact"
            className="flex flex-col items-center gap-4 bg-white border border-border
                       rounded-2xl p-8 text-center no-underline hover:shadow-card-hover
                       hover:border-primary/20 transition-all group"
          >
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <MessageCircle className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-primary text-base mb-1">Send us a message</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Use our contact form and we will respond within one working day.
              </p>
            </div>
          </Link>

          {/* Call or WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-4 bg-white border border-border
                       rounded-2xl p-8 text-center no-underline hover:shadow-card-hover
                       hover:border-green-400/30 transition-all group"
          >
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <Phone className="w-6 h-6 text-green-600" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-primary text-base mb-1">Call or WhatsApp us</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                +256 785 423 523. Mon to Fri, 8 am to 6 pm EAT.
              </p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
