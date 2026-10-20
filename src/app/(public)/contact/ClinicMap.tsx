"use client";

/**
 * ClinicMap - three-tier fallback:
 *   1. Leaflet raster map (no WebGL, no API key) - primary
 *   2. OpenStreetMap iframe embed                - if Leaflet fails
 *   3. Styled address card                       - if iframe fails
 *
 * No WebGL required at any level.
 */

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";

// Dynamically import Leaflet - ssr:false so it never runs on the server
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div
      className="absolute inset-0 bg-gray-100 rounded-2xl animate-pulse"
      aria-hidden="true"
    />
  );
}

interface Props {
  address: string;
  latitude: number;
  longitude: number;
}

type Level = "leaflet" | "iframe" | "card";

export default function ClinicMap({ address, latitude, longitude }: Props) {
  const delta = 0.004;
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const gmapsDirections = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const [level, setLevel] = useState<Level>("leaflet");
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const downgrade = useCallback(() => {
    setLevel((prev) => {
      if (prev === "leaflet") return "iframe";
      if (prev === "iframe")  return "card";
      return "card";
    });
  }, []);

  return (
    <div className="space-y-3">
      {/* ── Map container ──────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden border border-border"
        style={{ height: "clamp(320px, 45vw, 420px)" }}
      >
        {/* Skeleton always underneath until content fades in */}
        <MapSkeleton />

        {level === "leaflet" && (
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden"
            style={{ animation: "fadeIn 0.4s 0.1s ease-out both" }}
            suppressHydrationWarning
          >
            <LeafletMap latitude={latitude} longitude={longitude} onError={downgrade} />
          </div>
        )}

        {level === "iframe" && (
          <>
            <iframe
              src={osmEmbed}
              className="absolute inset-0 w-full h-full rounded-2xl"
              style={{
                border: 0,
                opacity: iframeLoaded ? 1 : 0,
                transition: "opacity 0.4s ease",
              }}
              loading="lazy"
              title="Musawo Training Center location - Luggala, Lubaga, Kampala"
              aria-label="Map showing Musawo Training Center in Luggala, Lubaga, Kampala"
              onLoad={() => setIframeLoaded(true)}
              onError={downgrade}
            />
            {/* If iframe hasn't loaded within 8s, fall through to address card */}
            <IframeTimeout onTimeout={downgrade} />
          </>
        )}

        {level === "card" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white p-6 text-center rounded-2xl">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <MapPin className="w-7 h-7 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-primary text-sm mb-1">Musawo Training Center</p>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs">{address}</p>
            </div>
            <a
              href={gmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600
                         text-white text-xs font-bold px-4 py-2 rounded-xl no-underline transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              View on Google Maps
            </a>
          </div>
        )}
      </div>

      {/* ── Action buttons ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white hover:bg-surface border border-border
                     text-primary text-xs font-semibold px-4 py-2.5 rounded-xl no-underline transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          Open in Google Maps
        </a>
        <a
          href={gmapsDirections}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600
                     text-white text-xs font-semibold px-4 py-2.5 rounded-xl no-underline transition-colors"
        >
          <Navigation className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          Get directions
        </a>
      </div>

      {/* ── Address pill ───────────────────────────────────────── */}
      <p className="flex items-start gap-2 text-xs text-gray-500 bg-surface rounded-xl
                    px-4 py-3 border border-border">
        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
        {address}
      </p>
    </div>
  );
}

/**
 * If the OSM iframe hasn't called onLoad after 8 seconds,
 * downgrade to the address card.
 */
function IframeTimeout({ onTimeout }: { onTimeout: () => void }) {
  useEffect(() => {
    const t = setTimeout(onTimeout, 8000);
    return () => clearTimeout(t);
  }, [onTimeout]);
  return null;
}
