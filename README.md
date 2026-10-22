# Claire Photography — GitHub Pages + Supabase-ready V2

A responsive, image-placeholder-first photography site. **Photos, albums, wardrobe, prices and text stay in GitHub. Only shooting events, codes, feedback and confirmation state are stored in Supabase.** No client registration.

## 1. Preview / publish

Website URL (available after GitHub Pages deployment): [Claire Photography](https://claireeeeeeee.github.io/claire_photo/).

Upload the **contents** of this folder to the root of a public GitHub repository. In Settings → Pages select Deploy from a branch → main → /(root). Open [https://claireeeeeeee.github.io/claire_photo/](https://claireeeeeeee.github.io/claire_photo/) after deployment. For local preview, use a simple HTTP server (`python3 -m http.server 8000`) instead of opening `index.html` with `file://`, because JSON files use fetch().

## 2. Edit photos and text without a database

- `data/albums.json`: portfolio albums; `cover` and `images` are paths such as `assets/cosplay-01/cover.webp`.
- `data/items.json`: wardrobe and props; `image` is a relative path such as `assets/dress.webp`.
- `data/site.json`: basic content, prices, default scheduling information. Some initial text is also in `index.html` and should be updated there.
- `assets/`: put your compressed, client-approved web images here. Empty strings display intentional placeholders.
- **Do not commit private photos or client details to a public repository.**

## 3. Configure Supabase

1. Create a Supabase project. In **Authentication → Users**, create your own admin user (email/password). Save its **User UUID**.
2. Open **SQL Editor**, execute `supabase/schema.sql`. Then run `insert into public.admins(user_id) values ('YOUR-AUTH-USER-UUID');` with the actual UUID.
3. In your local project, install the Supabase CLI. Log in, link the project and deploy the Edge Function:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set CODE_PEPPER=YOUR_LONG_RANDOM_SECRET
   supabase functions deploy shoot-access --no-verify-jwt
   ```
   `--no-verify-jwt` allows visitors without accounts to call the function; the function itself verifies admin JWTs for event creation/updates and restricts guest actions to code-based access. **The code is a bearer secret**: anybody who knows it can view, comment and confirm. Avoid personal contact details in the plan.
4. In Supabase **Project Settings → API** (or Connect), copy the **Project URL** and **publishable/anon key** into `config.js`:
   ```js
   window.CLAIRE_CONFIG = { supabaseUrl: 'https://PROJECT.supabase.co', supabasePublishableKey: 'sb_publishable_...', functionName: 'shoot-access', weatherLatitude: -36.8485, weatherLongitude: 174.7633, timezone: 'Pacific/Auckland' };
   ```
   The publishable key is safe in frontend code; **NEVER** put a `service_role`, secret API key, database password or `CODE_PEPPER` in GitHub or `config.js`.
5. Commit and push. Visit **Studio**, sign in with the admin user, create an event, and share its shooting code. Guests open **My Photoshoot** and enter the code. Confirmed plans can download `.ics`.

### Important security and functionality notes

- Guest codes are hashed with a server-side secret; there is no public direct database access. **The public guest function currently has no rate limiting**. Before sharing private details or opening the service broadly, add abuse protection / request rate limiting (e.g. Cloudflare Turnstile + gateway), and use longer unpredictable suffixes. A themed code is not inherently private.
- The public guest page lets any code-holder confirm an event, exactly as requested. This is **not** two-party identity verification.
- Admin event edits currently require re-entering the desired shooting code; you can keep the original code by entering it again. The hash cannot be reversed. Editing resets the event to pending and increases the version.
- Admin login uses Supabase Auth; only users listed in `public.admins` may view and manage events. For production, enable sensible Auth policies, MFA and database backups.
- The initial consultation **does not** create a database record: it creates text to copy into WeChat or another messaging app.
- ICS is a downloaded snapshot; it is **not** a subscribed/synced calendar. A later change requires a new download/import and the calendar app may treat it as an update based on UID.
- Weather uses the public Open-Meteo forecast endpoint for a **technical demo**. Its free tier has noncommercial-use restrictions. **Before using the public site for paid photography bookings, replace this with a weather service/plan that permits commercial use**, or disable the live weather call.
- English button currently translates the navigation labels only; full bilingual content is a follow-up improvement, not a completed feature.
- This package is a functional starter, not a security-audited production booking system. Test policies and guest flows before putting real customer information into it.

## 4. Suggested first test

1. Open My Photoshoot → enter `DEMO-MOON-07` (browser-only demonstration).
2. Fill Booking Enquiry → generate and copy a message.
3. Visit Wardrobe → select placeholder item → return to Booking.
4. Configure Supabase → create an event in Studio → open it with its themed code on another device → leave feedback → confirm → download ICS.

## 5. Files

- `index.html`, `style.css`, `app.js`, `config.js`: frontend.
- `data/*.json`: GitHub-managed public content.
- `supabase/schema.sql`: SQL tables and Row Level Security.
- `supabase/functions/shoot-access/index.ts`: guest code access and authenticated admin event writes.
