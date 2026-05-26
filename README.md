# 📦 BoxTracker — PWA Version

BoxTracker helps you track which items are stored in which moving box.

This version is ready for GitHub Pages and can be installed on a phone as a Progressive Web App (PWA).

## Files

```text
box-tracker/
├── index.html
├── style.css
├── app.js
├── manifest.json
├── service-worker.js
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

You do not need `server.py` or `data.json` for the public app version.

## How data is saved

Data is saved in each user's own browser using `localStorage`.

That means:

- No backend is needed.
- No database is needed.
- No API key is needed.
- Each user's boxes stay on their own device/browser.

## Voice commands

Voice works best on Google Chrome.

Examples:

| Say this | What happens |
|---|---|
| `Create box 1` | Creates a box named Box 1 |
| `Create box number two` | Creates a box named Box 2 |
| `New box Bathroom` | Creates a box named Bathroom |
| `Add scissors to Box 1` | Adds scissors to Box 1 |
| `Add bottles to box number two` | Adds bottles to Box 2 |
| `Add tape and glue to Box 1` | Adds multiple items |
| `Find scissors` | Searches for scissors |

## Run locally

Because this is a PWA, test it using a small local server instead of opening the HTML file directly.

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deploy on GitHub Pages

1. Push these files to your GitHub repo.
2. Go to your repo on GitHub.
3. Open **Settings**.
4. Click **Pages**.
5. Source: **Deploy from a branch**.
6. Branch: **main**.
7. Folder: **/root**.
8. Save.

Your app link will look like:

```text
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

## Install on phone

### iPhone

Open the link in Safari, tap Share, then tap **Add to Home Screen**.

### Android

Open the link in Chrome, tap the three dots, then tap **Install app** or **Add to Home screen**.

## Important note

Voice recognition support depends on the browser. Typed adding and searching will still work even if voice is unavailable.
