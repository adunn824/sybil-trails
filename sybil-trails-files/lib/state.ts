import { Redis } from "@upstash/redis";

export type Status = "open" | "caution" | "closed";
export type AlertLevel = "info" | "warning" | "danger";

export interface Alert {
  id: string;
  title: string;
  body: string;
  level: AlertLevel;
  startsAt?: string; // ISO date (YYYY-MM-DD) — optional
  endsAt?: string; // ISO date (YYYY-MM-DD) — optional, inclusive
}

export interface Segment {
  id: string;
  name: string;
  status: Status;
  note: string;
}

export interface Settings {
  tagline: string;
  lat: number;
  lon: number;
  emergencyPhone: string;
  contactLabel: string;
  contactPhone: string;
  showSegments: boolean;
  showWeather: boolean;
}

export interface TrailState {
  status: Status;
  headline: string;
  message: string;
  alerts: Alert[];
  segments: Segment[];
  rules: string[];
  settings: Settings;
  updatedAt: string;
  updatedBy: string;
}

export const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  caution: "Open with caution",
  closed: "Closed",
};

export const DEFAULT_STATE: TrailState = {
  status: "open",
  headline: "Trail is open",
  message: "Open for hiking and biking. Have a good one out there.",
  alerts: [],
  segments: [],
  rules: [
    "Hiking and biking welcome, sunrise to sunset.",
    "No motorized vehicles without the owner's permission.",
    "Dogs are welcome on a leash. Pack out what they leave.",
    "Stay on the marked trail. The land on either side is private.",
    "Pack out everything you pack in.",
    "Yield to uphill traffic; bikes yield to hikers.",
  ],
  settings: {
    tagline: "Trails on the ridge above Sybil Lake, Vergas, Minnesota.",
    lat: 46.656,
    lon: -95.805,
    emergencyPhone: "911",
    contactLabel: "Trail questions",
    contactPhone: "",
    showSegments: false,
    showWeather: true,
  },
  updatedAt: new Date("2026-09-14T12:00:00-05:00").toISOString(),
  updatedBy: "",
};

const KEY = "sybil-ridge:state";

function redis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// Fallback for local dev without Redis. Resets when the server restarts.
let memory: TrailState | null = null;

export async function getState(): Promise<TrailState> {
  const r = redis();
  if (!r) return memory ?? DEFAULT_STATE;
  const raw = await r.get<TrailState>(KEY);
  if (!raw) return DEFAULT_STATE;
  // Merge so newly added fields always have defaults.
  return {
    ...DEFAULT_STATE,
    ...raw,
    settings: { ...DEFAULT_STATE.settings, ...(raw.settings ?? {}) },
  };
}

export async function setState(next: TrailState): Promise<void> {
  const r = redis();
  if (!r) {
    memory = next;
    return;
  }
  await r.set(KEY, next);
}

export function sanitize(input: unknown): TrailState {
  const s = (input ?? {}) as Partial<TrailState>;
  const status: Status = ["open", "caution", "closed"].includes(s.status as string)
    ? (s.status as Status)
    : "open";
  const str = (v: unknown, max = 600) => (typeof v === "string" ? v.slice(0, max) : "");
  const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);
  const alerts: Alert[] = Array.isArray(s.alerts)
    ? s.alerts.slice(0, 30).map((a, i) => ({
        id: str(a?.id, 40) || `a${i}`,
        title: str(a?.title, 120),
        body: str(a?.body, 800),
        level: ["info", "warning", "danger"].includes(a?.level) ? a.level : "info",
        startsAt: str(a?.startsAt, 10) || undefined,
        endsAt: str(a?.endsAt, 10) || undefined,
      }))
    : [];
  const segments: Segment[] = Array.isArray(s.segments)
    ? s.segments.slice(0, 60).map((g, i) => ({
        id: str(g?.id, 40) || `s${i}`,
        name: str(g?.name, 80),
        status: ["open", "caution", "closed"].includes(g?.status) ? g.status : "open",
        note: str(g?.note, 200),
      }))
    : [];
  const rules = Array.isArray(s.rules)
    ? s.rules.map((r) => str(r, 200)).filter(Boolean).slice(0, 30)
    : DEFAULT_STATE.rules;
  const st = s.settings ?? DEFAULT_STATE.settings;
  return {
    status,
    headline: str(s.headline, 80),
    message: str(s.message, 600),
    alerts,
    segments,
    rules,
    settings: {
      tagline: str(st.tagline, 160),
      lat: num(st.lat, DEFAULT_STATE.settings.lat),
      lon: num(st.lon, DEFAULT_STATE.settings.lon),
      emergencyPhone: str(st.emergencyPhone, 30) || "911",
      contactLabel: str(st.contactLabel, 60),
      contactPhone: str(st.contactPhone, 30),
      showSegments: !!st.showSegments,
      showWeather: st.showWeather !== false,
    },
    updatedAt: new Date().toISOString(),
    updatedBy: str(s.updatedBy, 40),
  };
}

/** Alerts whose date window includes today (Central time). */
export function activeAlerts(state: TrailState, now = new Date()): Alert[] {
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); // YYYY-MM-DD
  return state.alerts.filter((a) => {
    if (!a.title && !a.body) return false;
    if (a.startsAt && a.startsAt > today) return false;
    if (a.endsAt && a.endsAt < today) return false;
    return true;
  });
}
