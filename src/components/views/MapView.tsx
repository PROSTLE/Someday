"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, Popup, setWorkerUrl } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { Item } from "@/lib/types";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export function MapView({ items }: { items: Item[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
    const map = new MapLibreMap({ container: container.current, style: STYLE_URL, center: [0, 20], zoom: 1 });
    map.addControl(new NavigationControl({ showCompass: false }));

    const bounds = new LngLatBounds();
    for (const item of items) {
      const point: [number, number] = [item.data.lng!, item.data.lat!];
      bounds.extend(point);
      const label = document.createElement("strong");
      label.textContent = item.title;
      new Marker({ color: "#E5575F" })
        .setLngLat(point)
        .setPopup(new Popup({ offset: 24 }).setDOMContent(label))
        .addTo(map);
    }
    map.fitBounds(bounds, { padding: 64, maxZoom: 14, animate: false });

    return () => map.remove();
  }, [items]);

  return <div ref={container} data-surface className="h-[60dvh] min-h-80 overflow-hidden rounded-[14px] border border-edge" />;
}
