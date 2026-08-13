# HH Goa 2026 — Frame In Goa

A web tool that generates a branded Hacker House Goa 2026 builder ID / profile frame / team card from an uploaded photo — built for the [HH Goa 2026 Open Trial shortlisting task](https://hhgoa.com/).

**Live site:** https://hhgoatask1.netlify.app/

## What it does

Upload a photo, fill in your name and role, pick a builder class and a theme, and generate a shareable, on-brand HH Goa card in seconds — no login, no signup, works start to finish in one pass.

## Features

- **Three output formats**
  - **ID Card** — full builder ID with name, role, builder class, and photo
  - **PFP Frame** — circular profile-picture frame, ready to use as an X/social avatar
  - **Team** — combine up to 3 people into one shared card, two ways:
    - *Individual Collage* — upload each teammate's photo separately
    - *Group Photo* — upload one team photo and drag pixel-style name tags onto each person
- **Team codes** — Create a team to get a shareable code, or join an existing team by entering one (synced across devices via Firebase)
- **4 visual themes** — Acid (default), Sunset, Jungle, and Official (matched to HH Goa's real brand palette: dark green / yellow / pink)
- **Stickers** — up to 2 on-brand icons, live preview before generating
- **3D flip card** — tap/click the generated card to flip it and reveal a QR code on the back
- **Camera or library upload** — supports JPG, PNG, WEBP, and HEIC (auto-converted)
- **Pan/zoom** on the uploaded photo before generating
- **Download** as a real PNG file
- **Share** to X (native share with image attach where supported, falling back to a pre-filled tweet intent), WhatsApp, and LinkedIn
- **Correct link previews** — proper Open Graph / Twitter Card tags so shared links show the actual branded image, not a blank thumbnail

## Tech stack

Plain HTML / CSS / JavaScript — no build step, no framework.

- `index.html` — markup
- `styles.css` — all styling
- `app.js` — all interactivity: photo handling, canvas-based card rendering/export, format & theme switching, stickers, flip/QR, team logic, sharing
- `firebase-team.js` — ES module handling the team-code create/join system via Firebase Firestore
- `og-image.png` — static branded image used for social link previews

### External libraries (loaded via CDN, no install needed)
- [heic2any](https://github.com/alexcorvi/heic2any) — converts iPhone HEIC photos to JPEG in the browser
- [qrcodejs](https://github.com/davidshimjs/qrcodejs) — generates the QR code on the card's flip side
- [Firebase JS SDK v10](https://firebase.google.com/docs/web/setup) (Firestore only) — team code storage

## Running locally

No build tools needed. Either:

```bash
# Option 1: just open it
open index.html

# Option 2: serve it (recommended, avoids file:// quirks)
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Deploying

Static site — works on Netlify, Vercel, GitHub Pages, or any static host. Currently deployed on Netlify, auto-deploying from the `main` branch on push.

```bash
git add .
git commit -m "your message"
git push origin main
```

## Team codes setup (Firebase)

The Create/Join team code feature needs a free Firebase project with Firestore enabled:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** (test mode is fine to start)
3. Register a **Web app** under Project Settings → Your apps
4. Copy the `firebaseConfig` values into `firebase-team.js`

> **Note:** Firestore is currently in *test mode*, meaning it's open read/write with no auth. That's fine for this task's timeline, but the rules auto-expire after 30 days and should be tightened (e.g. restrict writes to documents matching a valid code pattern) for any longer-term use.

## Known constraints

- Team compositing (Individual Collage / Group Photo) happens on a single device — teammates' names sync via the team code, but photos still need to be added locally by whoever is generating the final card, since photos are intentionally never uploaded anywhere.
- Export canvas is fixed at 1080×1350px (portrait, post-ready).

## Credits

Built for Hacker House Goa 2026 — [hhgoa.com](https://hhgoa.com) · #FrameInGoa
