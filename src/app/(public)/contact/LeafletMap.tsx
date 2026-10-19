"use client";

/**
 * LeafletMap - raster OSM tiles, no WebGL, no API key.
 *
 * Loaded only in the browser via next/dynamic (ssr:false in the parent).
 * Uses Leaflet 1.9.x with a custom divIcon pin so no broken image paths.
 */

import { useEffect, useRef } from "react";

// Luggala Trading Center, Lubaga Division, Kampala
export const LAT = 0.3075;
export const LNG = 32.5510;
const ZOOM = 16;

interface Props {
  /** Called when the map tiles fail to load */
  onError: () => void;
}

export default function LeafletMap({ onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamic import - keeps leaflet out of the server bundle
        const L = (await import("leaflet")).default;

        // Leaflet CSS must be loaded at runtime; use a link tag injection
        // instead of a static import to avoid TS module resolution errors
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id   = "leaflet-css";
          link.rel  = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (cancelled || !containerRef.current) return;

        // Create the map, scroll-wheel zoom disabled until user clicks
        const map = L.map(containerRef.current, {
          center: [LAT, LNG],
          zoom: ZOOM,
          scrollWheelZoom: false,   // re-enabled on click/tap (see below)
          zoomControl: true,
          attributionControl: true,
        });

        mapRef.current = map;

        // Re-enable scroll zoom on click so page still scrolls on mobile
        map.once("click", () => map.scrollWheelZoom.enable());

        // Raster OSM tiles - no WebGL required
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" ' +
            'target="_blank" rel="noopener">OpenStreetMap</a> contributors',
          maxZoom: 19,
          // Error per tile - if OSM tiles are blocked, fall back entirely
          errorTileUrl: "",
        }).addTo(map);

        // Custom div-based pin - no broken default icon paths
        const pin = L.divIcon({
          className: "",
          html: `
            <div style="
              width:32px;height:42px;position:relative;
              filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));
            ">
              <svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z"
                      fill="#0B6B5D"/>
                <circle cx="16" cy="16" r="7" fill="white"/>
              </svg>
            </div>
          `,
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -44],
        });

        L.marker([LAT, LNG], { icon: pin })
          .addTo(map)
          .bindPopup(
            '<strong style="color:#0B6B5D">Musawo Training Center</strong><br>' +
            "Plot 5, ADFA Building, Luggala Trading Center, Lubaga Division<br>Kampala, Uganda",
          )
          .openPopup();

        // Detect complete tile load failure (all tiles error'd)
        let errorCount = 0;
        const layer = map.eachLayer((l) => {
          if ((l as L.TileLayer).on) {
            (l as L.TileLayer).on("tileerror", () => {
              errorCount++;
              if (errorCount > 4) onError();
            });
          }
        });
        void layer;

      } catch {
        if (!cancelled) onError();
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onError]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl"
      role="application"
      aria-label="Interactive map showing Musawo Training Center in Luggala, Lubaga, Kampala"
    />
  );
}
