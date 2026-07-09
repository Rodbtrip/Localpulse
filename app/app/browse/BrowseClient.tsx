"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getNearbyShops, type NearbyShop } from "@/lib/actions/browse";
import { Card } from "@/components/ui/Card";
import { FILTER_CATEGORIES } from "@/lib/categories";

const CATEGORIES: { value: string | null; label: string }[] = [
  { value: null, label: "All" },
  ...FILTER_CATEGORIES,
];

const RADIUS_OPTIONS = [
  { label: "5 mi", meters: 8047 },
  { label: "10 mi", meters: 16093 },
  { label: "25 mi", meters: 40234 },
  { label: "50 mi", meters: 80467 },
];

function formatDistance(meters: number) {
  const miles = meters / 1609.34;
  return miles < 0.1 ? "Nearby" : `${miles.toFixed(1)} mi`;
}

export default function BrowseClient() {
  const [status, setStatus] = useState<"idle" | "locating" | "ready" | "denied" | "error">(
    "idle"
  );
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(RADIUS_OPTIONS[1].meters); // default 10 mi
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus("ready");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!coords) return;
    getNearbyShops(coords.lat, coords.lng, category, radiusMeters)
      .then(setShops)
      .catch(() => setStatus("error"));
  }, [coords, category, radiusMeters]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-coral">
        Nearby offers
      </p>
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink">
        What&apos;s happening around you
      </h1>

      {status === "locating" && (
        <Card className="mb-6 text-center text-sm text-ink/60">
          Finding your location…
        </Card>
      )}

      {status === "denied" && (
        <Card className="mb-6 text-sm text-ink/70">
          Location access was denied, so we can&apos;t show nearby offers. You can enable
          location for this site in your browser settings and reload the page.
        </Card>
      )}

      {status === "error" && (
        <Card className="mb-6 text-sm text-ink/70">
          Couldn&apos;t determine your location. Check your device&apos;s location settings and
          try again.
        </Card>
      )}

      {status === "ready" && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.label}
                  onClick={() => setCategory(c.value)}
                  className={`focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    category === c.value
                      ? "bg-coral text-paper"
                      : "border border-ink/15 text-ink/70 hover:border-ink/30"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <select
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="focus-ring rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink/70"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r.meters} value={r.meters}>
                  Within {r.label}
                </option>
              ))}
            </select>
          </div>

          {shops.length === 0 ? (
            <Card className="text-center text-sm text-ink/60">
              No local businesses found nearby in this category yet.
            </Card>
          ) : (
            <div className="space-y-3">
              {shops.map((shop) => (
                <Link key={shop.id} href={`/browse/${shop.id}`}>
                  <Card className="flex items-center justify-between transition-shadow hover:shadow-sm">
                    <div>
                      <p className="font-display text-lg font-semibold text-ink">
                        {shop.name}
                      </p>
                      <p className="text-sm text-ink/60">
                        {shop.city}
                        {shop.city && shop.state ? ", " : ""}
                        {shop.state} · {formatDistance(shop.distance_meters)}
                      </p>
                    </div>
                    <div className="text-right">
                      {shop.active_promotion_count > 0 ? (
                        <span className="rounded-full bg-pulse/15 px-3 py-1 text-xs font-semibold text-pulse">
                          {shop.active_promotion_count} active offer
                          {shop.active_promotion_count > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-ink/40">No active offers</span>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
