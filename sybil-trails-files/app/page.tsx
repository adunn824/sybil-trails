import Link from "next/link";
import Topo from "@/components/Topo";
import Updated from "@/components/Updated";
import Weather from "@/components/Weather";
import { activeAlerts, getState, STATUS_LABEL } from "@/lib/state";
import { prettyDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function Page() {
  const state = await getState();
  const alerts = activeAlerts(state);
  const s = state.settings;
  const segments = s.showSegments ? state.segments.filter((g) => g.name) : [];
  const mapsUrl = `https://maps.google.com/?q=${s.lat},${s.lon}`;

  return (
    <main>
      <header className="hero" data-status={state.status}>
        <Topo />
        <div className="hero__top">
          <strong>Sybil Ridge Trails</strong>
          <span>Vergas, Minnesota</span>
        </div>
        <div className="hero__body">
          <p className="hero__kicker">
            <span className={`hero__dot ${state.status === "open" ? "hero__dot--pulse" : ""}`} aria-hidden="true" />
            Right now the trail is
          </p>
          <h1 className="hero__status">{STATUS_LABEL[state.status]}</h1>
          {state.headline && <p className="hero__headline">{state.headline}</p>}
          {state.message && <p className="hero__message">{state.message}</p>}
          {alerts.length > 0 && (
            <a className="hero__alertcount" href="#alerts">
              {alerts.length === 1 ? "1 alert to know about" : `${alerts.length} alerts to know about`}
            </a>
          )}
        </div>
        <Updated iso={state.updatedAt} by={state.updatedBy} />
      </header>

      {alerts.length > 0 && (
        <section className="section" id="alerts" aria-labelledby="alerts-h">
          <h2 id="alerts-h">Before you head out</h2>
          {alerts.map((a) => (
            <article className="alert" key={a.id} data-level={a.level}>
              <div className="alert__bar" aria-hidden="true" />
              <div>
                {a.title && <h3>{a.title}</h3>}
                {a.body && <p>{a.body}</p>}
                {(a.startsAt || a.endsAt) && (
                  <p className="alert__when">
                    {a.startsAt && a.endsAt
                      ? `${prettyDate(a.startsAt)} – ${prettyDate(a.endsAt)}`
                      : a.endsAt
                        ? `Through ${prettyDate(a.endsAt)}`
                        : `From ${prettyDate(a.startsAt!)}`}
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {segments.length > 0 && (
        <section className="section" aria-labelledby="segments-h">
          <h2 id="segments-h">By section</h2>
          <div className="segments">
            {segments.map((g) => (
              <div className="segment" key={g.id} data-status={g.status}>
                <div className="segment__dot" aria-hidden="true" />
                <div>
                  <strong>{g.name}</strong>
                  <span>{g.note || STATUS_LABEL[g.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="rules-h">
        <h2 id="rules-h">Trail rules</h2>
        <ul className="rules">
          {state.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      {s.showWeather && <Weather lat={s.lat} lon={s.lon} />}

      <section className="section" aria-labelledby="help-h">
        <h2 id="help-h">If something goes wrong</h2>
        <div className="emergency">
          <div className="emergency__row">
            <div>
              <strong>Emergency</strong>
              <br />
              <span>Give them the trailhead location below.</span>
            </div>
            <a className="button button--danger" href={`tel:${s.emergencyPhone}`}>
              Call {s.emergencyPhone}
            </a>
          </div>
          <div className="emergency__row">
            <div>
              <strong>Trailhead location</strong>
              <br />
              <span>
                {s.lat.toFixed(4)}, {s.lon.toFixed(4)}
              </span>
            </div>
            <a className="button button--ghost" href={mapsUrl} target="_blank" rel="noreferrer">
              Open in Maps
            </a>
          </div>
          {s.contactPhone && (
            <div className="emergency__row">
              <div>
                <strong>{s.contactLabel || "Contact"}</strong>
                <br />
                <span>Not an emergency? Reach the trail steward.</span>
              </div>
              <a className="button button--ghost" href={`tel:${s.contactPhone}`}>
                {s.contactPhone}
              </a>
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        {s.tagline && <p>{s.tagline}</p>}
        <p>
          Trail stewards: <Link href="/admin">update this page</Link>.
        </p>
      </footer>
    </main>
  );
}
