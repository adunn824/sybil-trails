# Sybil Ridge Trails — status sign

A phone-first status page for the Sybil Ridge trail system (Vergas, MN). Put a QR code on the trailhead sign; hikers scan it and see whether the trail is open, any alerts (hunting, closures), the rules, weather and sunset, and emergency info. Stewards update it from `/admin` on their phone.

## What's here

- `/` — the public sign page. Refreshes itself every minute.
- `/admin` — password-protected editor. Status, headline, message, timed alerts, rules, optional per-section statuses, and settings.
- `/api/state` — JSON of the current state (GET is public; PUT requires the admin cookie).
- Weather and sunset come from Open-Meteo (free, no key).
- Storage is Upstash Redis (free tier on Vercel). Without it, the app still runs but changes reset on redeploy — fine for local testing only.

## Deploy to Vercel (about 10 minutes)

1. **Push this folder to a GitHub repo.**
2. In Vercel: **Add New → Project → Import** that repo. Framework is detected as Next.js. Click **Deploy** once to create the project (it'll work, but won't persist edits yet).
3. **Add storage:** Project → **Storage** tab → **Create Database** → **Upstash Redis** → free plan → **Connect**. Vercel adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to the project automatically.
4. **Set the password:** Project → **Settings → Environment Variables**. Add:
   - `ADMIN_PASSWORD` — the password stewards will use.
   - `SESSION_SECRET` — any long random string (used to sign the login cookie).
5. **Redeploy:** Deployments → ⋯ on the latest → **Redeploy**.
6. Open `https://your-project.vercel.app/admin`, sign in, and publish. Then add a custom domain under **Settings → Domains** if you have one.

## Putting it on the sign

Generate a QR code for the site URL (Vercel's URL or your domain). Print it big — at least 3" square — with a short line like "Scan for today's trail status". Laminate or use UV-stable vinyl.

## Run locally

```bash
cp .env.example .env.local   # fill in ADMIN_PASSWORD and SESSION_SECRET
npm install
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin.
