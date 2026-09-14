"use client";
import { useEffect, useState } from "react";
import type { Alert, AlertLevel, Segment, Status, TrailState } from "@/lib/state";

type Auth = "loading" | "out" | "in";

const PRESETS: { label: string; status: Status; headline: string; message: string }[] = [
  {
    label: "Open, normal",
    status: "open",
    headline: "Trail is open",
    message: "Open for hiking and biking. Have a good one out there.",
  },
  {
    label: "Muddy — please stay off",
    status: "caution",
    headline: "Soft and muddy after the rain",
    message: "Bikes and horses tear up the tread when it's like this. Give it a day or two to dry, or walk the edges.",
  },
  {
    label: "Hunting season",
    status: "caution",
    headline: "Hunting is happening on and near the trail",
    message: "Wear blaze orange, keep dogs leashed, and stay on the marked trail. See the alert below for dates.",
  },
  {
    label: "Closed — maintenance",
    status: "closed",
    headline: "Closed for trail work",
    message: "Crews and equipment are on the trail. Check back here for when it reopens.",
  },
  {
    label: "Closed — storm damage",
    status: "closed",
    headline: "Closed until downed trees are cleared",
    message: "Last night's storm brought trees down across several sections. Please stay off until we've cleared them.",
  },
];

const uid = () => Math.random().toString(36).slice(2, 10);

export default function Admin() {
  const [auth, setAuth] = useState<Auth>("loading");
  const [configured, setConfigured] = useState(true);
  const [pw, setPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [state, setState] = useState<TrailState | null>(null);
  const [rulesText, setRulesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth").then((x) => x.json());
      setConfigured(r.configured);
      setAuth(r.authed ? "in" : "out");
      if (r.authed) load();
    })();
  }, []);

  async function load() {
    const s: TrailState = await fetch("/api/state", { cache: "no-store" }).then((x) => x.json());
    setState(s);
    setRulesText(s.rules.join("\n"));
    setDirty(false);
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr("");
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (r.ok) {
      setAuth("in");
      load();
    } else {
      setLoginErr((await r.json()).error ?? "Couldn't sign in.");
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuth("out");
    setState(null);
  }

  function patch(p: Partial<TrailState>) {
    setState((s) => (s ? { ...s, ...p } : s));
    setDirty(true);
    setMsg(null);
  }
  function patchSettings(p: Partial<TrailState["settings"]>) {
    setState((s) => (s ? { ...s, settings: { ...s.settings, ...p } } : s));
    setDirty(true);
    setMsg(null);
  }

  async function save() {
    if (!state) return;
    setSaving(true);
    setMsg(null);
    const body = { ...state, rules: rulesText.split("\n").map((x) => x.trim()).filter(Boolean) };
    const r = await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) {
      const next = await r.json();
      setState(next);
      setRulesText(next.rules.join("\n"));
      setDirty(false);
      setMsg({ kind: "ok", text: "Published. The sign page is live." });
    } else {
      const err = await r.json().catch(() => ({}));
      setMsg({ kind: "err", text: err.error ?? "Save failed. Try again." });
      if (r.status === 401) setAuth("out");
    }
  }

  if (auth === "loading") return <div className="login"><p>Loading…</p></div>;

  if (auth === "out") {
    return (
      <div className="login admin">
        <h1>Sybil Ridge stewards</h1>
        <p>Sign in to change what the sign says.</p>
        {!configured && (
          <p className="login__err">
            The site has no admin password yet. Add ADMIN_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.
          </p>
        )}
        <form onSubmit={login}>
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          <button className="button" type="submit">Sign in</button>
          {loginErr && <p className="login__err">{loginErr}</p>}
        </form>
      </div>
    );
  }

  if (!state) return <div className="login"><p>Loading…</p></div>;
  const s = state.settings;

  return (
    <div className="admin">
      <h1>Update the sign</h1>
      <p className="admin__sub">
        Changes go live the moment you publish. <a href="/" target="_blank" rel="noreferrer">See the page</a> ·{" "}
        <button className="link-button" type="button" onClick={logout} style={{ color: "inherit" }}>Sign out</button>
      </p>

      <fieldset>
        <legend>Trail status</legend>
        <div className="statuspick" role="group" aria-label="Trail status">
          {(["open", "caution", "closed"] as Status[]).map((st) => (
            <button
              key={st}
              type="button"
              data-status={st}
              aria-pressed={state.status === st}
              onClick={() => patch({ status: st })}
            >
              {st === "open" ? "Open" : st === "caution" ? "Caution" : "Closed"}
            </button>
          ))}
        </div>
        <div className="presets" aria-label="Quick fills">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => patch({ status: p.status, headline: p.headline, message: p.message })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label htmlFor="headline">Headline</label>
        <input id="headline" type="text" value={state.headline} onChange={(e) => patch({ headline: e.target.value })} />
        <label htmlFor="message">Message</label>
        <textarea id="message" value={state.message} onChange={(e) => patch({ message: e.target.value })} />
        <label htmlFor="by">Your name (shown as "updated by")</label>
        <input id="by" type="text" value={state.updatedBy} onChange={(e) => patch({ updatedBy: e.target.value })} placeholder="optional" />
      </fieldset>

      <fieldset>
        <legend>Alerts</legend>
        <p className="admin__hint">
          Hunting dates, closures, events, bear sightings. Give an alert an end date and it disappears from the sign on its own.
        </p>
        {state.alerts.map((a, i) => (
          <div className="card" key={a.id}>
            <label>Title</label>
            <input type="text" value={a.title} onChange={(e) => updateAlert(i, { title: e.target.value })} placeholder="Deer season — firearms" />
            <label>Details</label>
            <textarea value={a.body} onChange={(e) => updateAlert(i, { body: e.target.value })} placeholder="Wear blaze orange. Hunters have permission on the north side of the ridge." />
            <div className="card__row">
              <div>
                <label>Starts</label>
                <input type="date" value={a.startsAt ?? ""} onChange={(e) => updateAlert(i, { startsAt: e.target.value || undefined })} />
              </div>
              <div>
                <label>Ends (inclusive)</label>
                <input type="date" value={a.endsAt ?? ""} onChange={(e) => updateAlert(i, { endsAt: e.target.value || undefined })} />
              </div>
            </div>
            <label>How serious</label>
            <select value={a.level} onChange={(e) => updateAlert(i, { level: e.target.value as AlertLevel })}>
              <option value="info">Good to know</option>
              <option value="warning">Heads up</option>
              <option value="danger">Safety</option>
            </select>
            <div className="card__actions">
              <button className="link-button" type="button" onClick={() => patch({ alerts: state.alerts.filter((_, j) => j !== i) })}>
                Remove alert
              </button>
            </div>
          </div>
        ))}
        <div className="presets">
          <button type="button" onClick={() => patch({ alerts: [...state.alerts, { id: uid(), title: "", body: "", level: "warning" }] })}>
            + Add alert
          </button>
          <button
            type="button"
            onClick={() =>
              patch({
                alerts: [
                  ...state.alerts,
                  {
                    id: uid(),
                    title: "Hunting in progress",
                    body: "Hunters have the owner's permission on and around the trail. Wear blaze orange, keep dogs leashed, and stay on the marked trail.",
                    level: "danger",
                  },
                ],
              })
            }
          >
            + Hunting alert
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Trail rules</legend>
        <p className="admin__hint">One rule per line. These stay on the sign all the time.</p>
        <textarea
          value={rulesText}
          onChange={(e) => {
            setRulesText(e.target.value);
            setDirty(true);
          }}
          style={{ minHeight: 180 }}
        />
      </fieldset>

      <fieldset>
        <legend>Sections (optional)</legend>
        <label className="check">
          <input type="checkbox" checked={s.showSegments} onChange={(e) => patchSettings({ showSegments: e.target.checked })} />
          Show a section-by-section list on the sign
        </label>
        {s.showSegments && (
          <>
            {state.segments.map((g, i) => (
              <div className="card" key={g.id}>
                <div className="card__row">
                  <div>
                    <label>Name</label>
                    <input type="text" value={g.name} onChange={(e) => updateSeg(i, { name: e.target.value })} placeholder="North Ridge Loop" />
                  </div>
                  <div>
                    <label>Status</label>
                    <select value={g.status} onChange={(e) => updateSeg(i, { status: e.target.value as Status })}>
                      <option value="open">Open</option>
                      <option value="caution">Caution</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
                <label>Note</label>
                <input type="text" value={g.note} onChange={(e) => updateSeg(i, { note: e.target.value })} placeholder="Two trees down past the creek crossing" />
                <div className="card__actions">
                  <button className="link-button" type="button" onClick={() => patch({ segments: state.segments.filter((_, j) => j !== i) })}>
                    Remove section
                  </button>
                </div>
              </div>
            ))}
            <div className="presets">
              <button type="button" onClick={() => patch({ segments: [...state.segments, { id: uid(), name: "", status: "open", note: "" }] })}>
                + Add section
              </button>
            </div>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>Sign settings</legend>
        <label htmlFor="tagline">Tagline (footer)</label>
        <input id="tagline" type="text" value={s.tagline} onChange={(e) => patchSettings({ tagline: e.target.value })} />
        <div className="card__row">
          <div>
            <label htmlFor="lat">Trailhead latitude</label>
            <input id="lat" type="number" step="0.0001" value={s.lat} onChange={(e) => patchSettings({ lat: parseFloat(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="lon">Trailhead longitude</label>
            <input id="lon" type="number" step="0.0001" value={s.lon} onChange={(e) => patchSettings({ lon: parseFloat(e.target.value) })} />
          </div>
        </div>
        <p className="admin__hint">Used for the weather widget and the "Open in Maps" pin. Right-click the trailhead in Google Maps to copy its coordinates.</p>
        <div className="card__row">
          <div>
            <label htmlFor="clabel">Contact label</label>
            <input id="clabel" type="text" value={s.contactLabel} onChange={(e) => patchSettings({ contactLabel: e.target.value })} />
          </div>
          <div>
            <label htmlFor="cphone">Contact phone (blank to hide)</label>
            <input id="cphone" type="tel" value={s.contactPhone} onChange={(e) => patchSettings({ contactPhone: e.target.value })} />
          </div>
        </div>
        <label htmlFor="ephone">Emergency number</label>
        <input id="ephone" type="tel" value={s.emergencyPhone} onChange={(e) => patchSettings({ emergencyPhone: e.target.value })} />
        <label className="check">
          <input type="checkbox" checked={s.showWeather} onChange={(e) => patchSettings({ showWeather: e.target.checked })} />
          Show weather and sunset
        </label>
      </fieldset>

      <div className="savebar">
        <span className="savebar__msg" data-kind={msg?.kind}>
          {msg ? msg.text : dirty ? "Unpublished changes" : "Everything is published"}
        </span>
        <button className="button" type="button" onClick={save} disabled={saving || !dirty}>
          {saving ? "Publishing…" : "Publish"}
        </button>
      </div>
    </div>
  );

  function updateAlert(i: number, p: Partial<Alert>) {
    patch({ alerts: state!.alerts.map((a, j) => (j === i ? { ...a, ...p } : a)) });
  }
  function updateSeg(i: number, p: Partial<Segment>) {
    patch({ segments: state!.segments.map((g, j) => (j === i ? { ...g, ...p } : g)) });
  }
}
