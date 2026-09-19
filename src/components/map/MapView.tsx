"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type MapPlace = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  lat: number;
  lng: number;
  avg: number | null;
  n: number;
  visited: boolean;
  saved: boolean;
};

const MADRID: [number, number] = [40.4168, -3.7038];

// Pins are plain HTML divIcons: the default Leaflet marker images don't survive bundling.
function pin(place: MapPlace) {
  const color = place.visited ? "#c2410c" : place.saved ? "#0f766e" : "#78716c";
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

function FitBounds({ places }: { places: MapPlace[] }) {
  const map = useMap();
  useEffect(() => {
    if (places.length === 0) return;
    const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, places]);
  return null;
}

export default function MapView({ places }: { places: MapPlace[] }) {
  return (
    <MapContainer center={MADRID} zoom={12} scrollWheelZoom className="h-[62vh] w-full rounded-xl border border-stone-200">
      {/* Public OpenStreetMap tiles: free, no key, fine for a closed beta. Their usage policy
          doesn't allow heavy production traffic, so swap for a keyed provider before launch. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds places={places} />
      {places.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pin(p)}>
          <Popup>
            <div className="min-w-36">
              <a href={`/places/${p.id}`} className="font-semibold text-stone-900">
                {p.name}
              </a>
              {p.avg != null && (
                <div className="text-sm">
                  ★ {p.avg.toFixed(1)} <span className="text-stone-500">({p.n})</span>
                </div>
              )}
              {p.address && <div className="text-xs text-stone-500">{p.address}</div>}
              {(p.visited || p.saved) && (
                <div className="mt-1 text-xs">{p.visited ? "✓ Visitado" : "🔖 Quiero ir"}</div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
