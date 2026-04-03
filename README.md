# Nightloop

Nightloop is an Expo app for finding nearby nightlife venues, checking in, and
seeing who is out.

## App setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local app env file:

   ```bash
   copy .env.example .env
   ```

3. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

4. Start the app:

   ```bash
   npx expo start
   ```

## Real nearby venues

The app calls the Supabase edge function `quick-endpoint` for live nearby
results. That function now uses Google Places Nearby Search and persists each
place into `public.venues` so the venue detail and check-in flows still work.

### What you need

1. A Google Maps Platform API key with Places API enabled.
2. The new migration applied to your Supabase database.
3. The `quick-endpoint` function deployed with the Google key stored as a
   Supabase secret.

### Local function env

Create a local function env file:

```bash
copy supabase\.env.example supabase\.env.local
```

Set:

- `GOOGLE_PLACES_API_KEY=your_real_key`
- `ENABLE_DEMO_VENUES=false`

The function also accepts `GOOGLE_MAPS_API_KEY` for compatibility with older
Supabase secret naming.

### Push the database migration

```bash
npx supabase db push
```

### Set the function secret

```bash
npx supabase secrets set GOOGLE_PLACES_API_KEY=your_real_key --project-ref <YOUR_SUPABASE_PROJECT_REF>
```

If your project already has `GOOGLE_MAPS_API_KEY` set, the function will use
that without any extra secret changes.

### Deploy the function

```bash
npx supabase functions deploy quick-endpoint --project-ref <YOUR_SUPABASE_PROJECT_REF> --no-verify-jwt
```

### Serve locally

```bash
npx supabase functions serve quick-endpoint --env-file supabase/.env.local --no-verify-jwt
```

`quick-endpoint` is currently intended to be callable without a user JWT. If you
want to require authenticated users instead, remove `--no-verify-jwt` and make
sure the app refreshes or re-establishes a valid Supabase session before
invoking the function.

## Demo mode

If you want mock venues instead of Google Places:

- Set `EXPO_PUBLIC_ENABLE_DEMO_VENUES=true` in `.env`
- Set `ENABLE_DEMO_VENUES=true` in `supabase/.env.local` or in Supabase secrets

## Real 21+ verification with Persona

The app now supports a real provider-backed 21+ flow with Persona. The device
does not sign or approve anything itself. Instead:

1. The app asks Supabase to create a Persona inquiry.
2. The app opens Persona Hosted Flow in the browser.
3. Persona redirects back to the app with an `inquiry-id`.
4. Supabase retrieves the inquiry from Persona and decides whether the user is
   actually 21+.
5. A Persona webhook backfills the same result if approval finishes after the
   browser redirect.

### App env

Set this in `.env`:

- `EXPO_PUBLIC_AGE_VERIFICATION_PROVIDER=persona`

### Function env

Set these in `supabase/.env.local` and in deployed Supabase secrets:

- `PERSONA_API_KEY=your_persona_api_key`
- `PERSONA_INQUIRY_TEMPLATE_ID=itmpl_...`
- `PERSONA_WEBHOOK_SECRET=your_persona_webhook_secret`
- optional `PERSONA_HOSTED_FLOW_BASE_URL=https://inquiry.withpersona.com/verify`
- optional `PERSONA_API_VERSION=2025-12-08`

### Persona dashboard setup

1. Create a Persona inquiry template for nightlife onboarding.
2. Configure the template so it collects a government ID and exposes a
   `birthdate` field that Persona can return via the inquiry API.
3. Make sure the flow only reaches approval for adults 21+.
4. Add a webhook in Persona that points to:

   ```text
   https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/persona-webhook
   ```

5. Allow the app callback URI in Persona redirect settings. For production app
   builds, use:

   ```text
   nightloop://age-verification
   ```

### Push the database migrations

```bash
npx supabase db push
```

That includes the real verification metadata migration:

- `supabase/migrations/20260402120000_age_verification_provider.sql`

### Set the Supabase secrets

```bash
npx supabase secrets set PERSONA_API_KEY=your_persona_api_key --project-ref <YOUR_SUPABASE_PROJECT_REF>
npx supabase secrets set PERSONA_INQUIRY_TEMPLATE_ID=itmpl_your_template_id --project-ref <YOUR_SUPABASE_PROJECT_REF>
npx supabase secrets set PERSONA_WEBHOOK_SECRET=your_persona_webhook_secret --project-ref <YOUR_SUPABASE_PROJECT_REF>
```

If you want branded Hosted Flow URLs instead of the default Persona domain, also
set:

```bash
npx supabase secrets set PERSONA_HOSTED_FLOW_BASE_URL=https://your-subdomain.withpersona.com/verify --project-ref <YOUR_SUPABASE_PROJECT_REF>
```

### Deploy the functions

Deploy the authenticated functions with JWT verification enabled:

```bash
npx supabase functions deploy start-age-verification --project-ref <YOUR_SUPABASE_PROJECT_REF>
npx supabase functions deploy verify-age-result --project-ref <YOUR_SUPABASE_PROJECT_REF>
```

Deploy the Persona webhook without JWT verification:

```bash
npx supabase functions deploy persona-webhook --project-ref <YOUR_SUPABASE_PROJECT_REF> --no-verify-jwt
```

### Serve locally

```bash
npx supabase functions serve start-age-verification --env-file supabase/.env.local
npx supabase functions serve verify-age-result --env-file supabase/.env.local
npx supabase functions serve persona-webhook --env-file supabase/.env.local --no-verify-jwt
```
