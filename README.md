# ThoughtFlow

ThoughtFlow turns unstructured thoughts into organized priorities, projects, and next actions. This version includes a web app, FastAPI backend, PostgreSQL-ready storage, OpenAI organization, offline support, and Capacitor iOS packaging.

## Architecture

- Frontend: Vite, HTML, CSS, and JavaScript
- API: FastAPI and SQLAlchemy
- Storage: SQLite locally, PostgreSQL in production
- AI: OpenAI Responses API with structured output
- Mobile: Capacitor for iOS
- Offline: localStorage plus a service worker

The local deterministic organizer remains available whenever the API or OpenAI is unavailable.

## Run locally

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Add an `OPENAI_API_KEY` to `backend/.env` to enable AI organization. Without it, the API uses the local organizer.

For PostgreSQL, set:

```env
DATABASE_URL=postgresql+psycopg://thoughtflow:thoughtflow@localhost:5432/thoughtflow
```

Alternatively, run the API and PostgreSQL together:

```bash
docker compose up --build
```

### Frontend

In another terminal:

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Build the iPhone app

DISCLAIMER: iPhone app will not be published because of the $99/year Apple Developer Fee. However, this tool was built with that as the final intent. 

Install the full Xcode application from the Mac App Store first. Then:

```bash
npm run ios:sync
npm run ios:open
```

In Xcode:

1. Select the `App` target.
2. Choose your Apple Developer team under Signing & Capabilities.
3. Confirm the bundle identifier `com.darinbrion.thoughtflow` is available.
4. Run the app in an iPhone simulator.
5. Use Product > Archive when ready for TestFlight.

For a deployed API, create `.env.production` before running `npm run ios:sync`:

```env
VITE_API_URL=https://your-thoughtflow-api.example.com
```

## Native functionality

- iOS share sheet for thoughts
- High-priority local reminders
- Light haptic feedback
- Deep-link capture through `thoughtflow://capture?text=...`
- Safe-area-aware layouts
- Offline capture and cached app shell

## Production notes

- Keep `OPENAI_API_KEY` on the backend only.
- Use hosted PostgreSQL and set `DATABASE_URL` on the API host.
- Restrict `ALLOWED_ORIGINS` to the deployed web domain and Capacitor origins.
- Add authentication before storing real users' private thoughts in production.
- Publish a privacy policy before TestFlight or App Store submission.
