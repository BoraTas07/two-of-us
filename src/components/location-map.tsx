"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export type MapPerson = {
  name: string;
  emoji: string;
  color: string;
  lat: number;
  lng: number;
  accuracy: number | null;
};

/** Kullanıcıdan gelen metni HTML içine güvenle koymak için */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** İkinizi aynı haritada gösterir (OpenStreetMap). Leaflet sadece tarayıcıda yüklenir. */
export default function LocationMap({ people }: { people: MapPerson[] }) {
  const el = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(people);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      map = L.map(el.current, { zoomControl: true, attributionControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const pts: [number, number][] = [];
      for (const p of people) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:44px;height:44px;border-radius:9999px;background:#fffcf7;border:3px solid ${/^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#a65d3c"};display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 3px 10px rgba(0,0,0,.25)">${esc(p.emoji)}</div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        L.marker([p.lat, p.lng], { icon, title: p.name }).addTo(map).bindTooltip(esc(p.name), { direction: "top", offset: [0, -22] });
        if (p.accuracy && p.accuracy > 30 && p.accuracy < 5000) {
          L.circle([p.lat, p.lng], { radius: p.accuracy, color: p.color, weight: 1, fillOpacity: 0.08 }).addTo(map);
        }
        pts.push([p.lat, p.lng]);
      }
      if (pts.length >= 2) map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 16 });
      else if (pts.length === 1) map.setView(pts[0], 15);
      else map.setView([39.0, 35.0], 5);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // people değişince harita yeniden kurulur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // isolate: Leaflet katmanları sabit başlık/alt menünün üstüne çıkmasın
  return <div ref={el} className="relative isolate z-0 h-80 w-full overflow-hidden rounded-2xl" role="img" aria-label="Konum haritası" />;
}
