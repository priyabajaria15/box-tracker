# BoxTracker — Next.js Version

This is the same BoxTracker app converted to Next.js.

## Files

```text
boxtracker-next/
├── app/
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── public/
│   ├── manifest.json
│   ├── service-worker.js
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── .env.local.example
├── .gitignore
├── package.json
└── README.md
```

## Firebase setup

Create a file named `.env.local` in the main project folder.

Copy this into it and replace the values with your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Install and run

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Firestore rules

Use these rules while testing:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /boxTracker/{document} {
      allow read, write: if true;
    }
  }
}
```

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
