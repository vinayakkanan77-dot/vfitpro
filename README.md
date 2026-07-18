# VFitPro Backend

Node.js 22 + Express backend that replaces Firebase Cloud Functions for VFitPro.
It reads/updates Firestore, sends transactional email through Brevo, and returns
JSON to the Android app. Nothing about Firebase Auth, Firestore structure,
Cloudinary uploads, or existing Android screens changes — this server is a
drop-in replacement for the Cloud Functions layer only.

```
Android → HTTPS → Render (this server) → Firebase Admin SDK → Firestore
                                        → Brevo REST API
```

## 1. Project setup

### Install Node.js 22

- macOS: `brew install node@22`
- Windows: download the Node 22 LTS installer from https://nodejs.org
- Linux: use [nvm](https://github.com/nvm-sh/nvm):
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  nvm install 22
  nvm use 22
  ```

Verify:
```bash
node -v   # should print v22.x.x
npm -v
```

### Install dependencies

```bash
cd backend
npm install
```

## 2. Create a Firebase Service Account

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your VFitPro project.
3. Click the gear icon → **Project settings** → **Service accounts** tab.
4. Click **Generate new private key**. A JSON file downloads.
5. Open the JSON file — you need three fields from it:
   - `project_id`
   - `client_email`
   - `private_key`

You do **not** need to commit this JSON file anywhere. Locally you can keep
it as `firebase-service-account.json` for reference (it's git-ignored), but
the server itself reads credentials from environment variables only — this
is what Render (and most hosts) expect, and avoids ever committing a secret
file to git.

## 3. Environment variables

Copy the example file:

```bash
cp .env.example .env
```

Fill in:

| Variable | Where to get it |
|---|---|
| `PORT` | `10000` locally, Render sets this automatically in production |
| `ALLOWED_ORIGINS` | Comma-separated list of origins allowed to call this API from a browser. Native Android calls don't send an Origin header, so this mainly matters if you also have a web client. |
| `FIREBASE_PROJECT_ID` | `project_id` from the service account JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the service account JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` from the service account JSON. Keep the `\n` sequences literal — the app converts them to real newlines at startup. Wrap the whole value in double quotes. |
| `BREVO_API_KEY` | Brevo dashboard → SMTP & API → API Keys |
| `BREVO_SENDER_EMAIL` | A verified sender in your Brevo account |
| `BREVO_SENDER_NAME` | Display name for outgoing email, e.g. `VFitPro` |
| `OWNER_EMAIL` | Where feedback emails are delivered |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Optional, defaults to 100 requests / 15 min per IP |

## 4. Running locally

```bash
npm run dev
```

This starts the server with `node --watch` so it restarts on file changes.
You should see a log line like:

```json
{"timestamp":"...","level":"info","message":"VFitPro backend started","port":10000,"env":"development"}
```

Check the health endpoint:

```bash
curl http://localhost:10000/api/health
```

## 5. Testing the APIs

All endpoints except `/api/health` require a Firebase ID token.

### Getting a test ID token

Easiest option: add a temporary debug button in the Android app that calls
`FirebaseAuth.getInstance().currentUser.getIdToken(true)` and logs the
result, then copy it from Logcat. Tokens expire after 1 hour.

### curl examples

```bash
# Health check
curl http://localhost:10000/api/health

# Send bill
curl -X POST http://localhost:10000/api/sendBill \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"uid":"USER_UID","customerId":"CUSTOMER_ID","billId":"BILL_ID"}'

# Send stitched notification
curl -X POST http://localhost:10000/api/sendStitched \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"uid":"USER_UID","customerId":"CUSTOMER_ID"}'

# Send feedback
curl -X POST http://localhost:10000/api/sendFeedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"uid":"USER_UID","feedbackId":"FEEDBACK_ID"}'
```

### Postman collection

Import `postman_collection.json` (in this repo) into Postman. Set two
collection variables before running requests:

- `baseUrl` — e.g. `http://localhost:10000` or your Render URL
- `idToken` — a fresh Firebase ID token

## 6. Deploying to Render

1. Push this `backend/` folder to a GitHub repository.
2. In the [Render Dashboard](https://dashboard.render.com/), click
   **New +** → **Blueprint**, and point it at your repo — Render will read
   `render.yaml` and create the service automatically.
   (Alternatively: **New +** → **Web Service**, connect the repo, set
   **Build Command** to `npm install` and **Start Command** to `npm start`.)
3. Under the service's **Environment** tab, add every variable marked
   `sync: false` in `render.yaml` (all the secrets from step 3 above).
   For `FIREBASE_PRIVATE_KEY`, paste the key including the literal `\n`
   sequences, same as in your local `.env`.
4. Deploy. Render will run `npm install` then `npm start`.
5. Confirm it's live:
   ```bash
   curl https://your-service.onrender.com/api/health
   ```
6. Render's free/starter plans spin down after inactivity — the first
   request after idle can take a few seconds while the instance wakes up.
   Keep this in mind for the Android network timeout (see below).

## 7. Connecting the Android app

See the companion `android-integration/` folder for `ApiClient`,
`ApiService`, `EmailApiService`, and `EmailRepository`, plus the updated
`BillHelper`, `OrderStitchedUploadDialog`, and `FeedbackSupportActivity`
call sites. Set the base URL to your Render service URL (with a trailing
slash), and make sure the Android app sends the current user's Firebase ID
token in the `Authorization: Bearer <token>` header on every call — get a
fresh token with `getIdToken(false)` (Firebase caches and auto-refreshes it)
rather than hardcoding one.

## 8. Common errors & troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Server won't start: `Firebase Admin credentials are not fully configured` | Missing/blank env var | Check `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` are all set |
| `401 Invalid or expired ID token` | Token expired (>1hr) or wrong Firebase project | Get a fresh token; confirm Android's `google-services.json` matches the same Firebase project as `FIREBASE_PROJECT_ID` |
| `403 uid does not match authenticated user` | Client sent a `uid` in the body that isn't the signed-in user | Always send the currently signed-in user's uid, never a hardcoded/different one |
| `404 Customer/Bill/Shop not found` | Wrong document id, or doc lives in a differently-named collection | Check `utils/constants.js` collection names match your actual Firestore collections |
| Brevo emails fail with `502` | Bad `BREVO_API_KEY`, unverified sender, or Brevo outage | Check Brevo dashboard logs; server retries transient failures automatically (3 attempts) |
| CORS error from a browser client | Origin not in `ALLOWED_ORIGINS` | Add the origin, comma-separated, no trailing slash |
| Render service sleeps / first request is slow | Free/starter plan idles after inactivity | Upgrade plan, or add a periodic health-check ping, or accept the cold-start delay |
| `429 Too many requests` | Rate limit hit | Adjust `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`, or investigate a retry loop on the client |

## Project structure

```
backend/
  server.js                 App entry point, middleware wiring
  package.json
  .env.example
  render.yaml
  firebase-service-account.json.example
  config/
    firebase.js              Firebase Admin init (env-var based)
    brevo.js                 Brevo REST client with retry
    logger.js                Structured JSON logger
  routes/
    bill.routes.js            POST /api/sendBill
    stitched.routes.js        POST /api/sendStitched
    feedback.routes.js        POST /api/sendFeedback
    health.routes.js          GET  /api/health
  middleware/
    auth.js                  Firebase ID token verification
    errorHandler.js          Central error handling + asyncHandler
    validate.js              express-validator result handling
  services/
    bill.service.js
    customer.service.js
    shop.service.js
    email.service.js
  templates/
    billTemplate.js
    stitchedTemplate.js
    feedbackTemplate.js
  utils/
    response.js
    constants.js
```
# vfitpro
