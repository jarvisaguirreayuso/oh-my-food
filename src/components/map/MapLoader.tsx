"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` when imported, so it can only load in the browser.
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-[62vh] w-full animate-pulse rounded-xl bg-stone-100" />,
});

export { MapView as MapLoader };
export type { MapPlace } from "./MapView";
