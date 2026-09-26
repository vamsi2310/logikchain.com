import { fail } from "../errors";
import { googleMapsServerKey } from "../runtime";

interface Point {
  latitude: number;
  longitude: number;
}

function validPoint(point: Point | undefined): point is Point {
  return Boolean(
    point &&
      Number.isFinite(point.latitude) &&
      point.latitude >= -90 &&
      point.latitude <= 90 &&
      Number.isFinite(point.longitude) &&
      point.longitude >= -180 &&
      point.longitude <= 180
  );
}

function pointValue(point: Point): string {
  return `${point.latitude},${point.longitude}`;
}

function apiKey(): string {
  return process.env.GOOGLE_MAPS_API_KEY || googleMapsServerKey.value();
}

export async function computeRouteMetrics(input: {
  origin: Point;
  destination: Point;
  waypoints?: Point[];
}): Promise<{ lengthKm: number; durationMinutes: number }> {
  if (
    !validPoint(input.origin) ||
    !validPoint(input.destination) ||
    (input.waypoints ?? []).some((point) => !validPoint(point))
  ) {
    fail("INVALID_ARGUMENT", "Route coordinates are invalid");
  }

  const params = new URLSearchParams({
    origin: pointValue(input.origin),
    destination: pointValue(input.destination),
    key: apiKey(),
  });
  if (input.waypoints?.length) {
    params.set("waypoints", input.waypoints.map(pointValue).join("|"));
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );
    if (!response.ok) fail("UNAVAILABLE", "Maps service is unavailable");
    const payload = (await response.json()) as {
      status?: string;
      routes?: Array<{ legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }> }>;
    };
    if (payload.status !== "OK" || !payload.routes?.[0]?.legs?.length) {
      fail("UNAVAILABLE", `Maps route failed: ${payload.status ?? "unknown"}`);
    }
    const totals = payload.routes[0].legs.reduce(
      (sum, leg) => ({
        meters: sum.meters + Number(leg.distance?.value ?? 0),
        seconds: sum.seconds + Number(leg.duration?.value ?? 0),
      }),
      { meters: 0, seconds: 0 }
    );
    return {
      lengthKm: Math.round((totals.meters / 1000) * 100) / 100,
      durationMinutes: Math.ceil(totals.seconds / 60),
    };
  } catch (error) {
    if ((error as { details?: { code?: string } }).details?.code) throw error;
    fail("UNAVAILABLE", "Maps service is unavailable");
  }
}

export async function pingMaps(): Promise<"ok" | "down"> {
  try {
    const params = new URLSearchParams({ address: "0,0", key: apiKey() });
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
    );
    return response.ok ? "ok" : "down";
  } catch {
    return "down";
  }
}
