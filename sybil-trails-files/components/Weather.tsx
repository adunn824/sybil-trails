const CODES: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Freezing fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow",
  77: "Snow grains", 80: "Rain showers", 81: "Rain showers", 82: "Heavy showers",
  85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ hail",
};

interface Forecast {
  current: { temperature_2m: number; weather_code: number; wind_speed_10m: number; precipitation: number };
  daily: {
    time: string[]; sunrise: string[]; sunset: string[];
    temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[]; precipitation_probability_max: number[];
  };
}

function hhmm(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
}

export default async function Weather({ lat, lon }: { lat: number; lon: number }) {
  let data: Forecast | null = null;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,wind_speed_10m,precipitation` +
      `&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago&forecast_days=3`;
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (res.ok) data = (await res.json()) as Forecast;
  } catch {
    data = null;
  }
  if (!data) return null;

  const c = data.current;
  const d = data.daily;
  const dayName = (t: string, i: number) =>
    i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(t + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });

  return (
    <section className="section" aria-labelledby="weather-h">
      <h2 id="weather-h">At the trailhead right now</h2>
      <div className="weather">
        <div className="weather__temp">
          {Math.round(c.temperature_2m)}
          <sup>°F</sup>
        </div>
        <div className="weather__meta">
          <div><strong>{CODES[c.weather_code] ?? "—"}</strong></div>
          <div>Wind {Math.round(c.wind_speed_10m)} mph</div>
          <div>Sunrise {hhmm(d.sunrise[0])} · Sunset <strong>{hhmm(d.sunset[0])}</strong></div>
        </div>
      </div>
      <div className="weather__forecast">
        {d.time.slice(0, 3).map((t, i) => (
          <div className="weather__day" key={t}>
            <strong>{dayName(t, i)}</strong>
            {Math.round(d.temperature_2m_max[i])}° / {Math.round(d.temperature_2m_min[i])}°
            <br />
            {CODES[d.weather_code[i]] ?? ""}
            {d.precipitation_probability_max[i] > 0 ? ` · ${d.precipitation_probability_max[i]}% precip` : ""}
          </div>
        ))}
      </div>
      <p className="weather__note">Forecast from Open-Meteo, refreshed every 15 minutes. Plan to be off the trail by sunset.</p>
    </section>
  );
}
