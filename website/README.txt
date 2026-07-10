LocalPulse — Marketing Website
==============================

Everything is in one file: index.html (logo images embedded, no external
assets needed beyond Google Fonts, which load from the web).

DEPLOY (2 minutes, free):
1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page
3. Netlify gives you a live URL immediately — connect your custom domain
   in Site settings -> Domain management when ready.

Also works with any static host (Vercel, GitHub Pages, SiteDrop.ai) or a
plain web server — there is no build step.

NOTES:
- The "Download for iPhone / Android" buttons point to get/ — a small
  self-contained "Get LocalPulse" page (get/index.html) that detects the
  visitor's phone and forwards it to the right store. The app is not on
  the stores yet, so the page honestly shows "Coming soon". When the
  listings exist, fill in the APP_STORE_URL and PLAY_STORE_URL constants
  at the top of get/index.html — that is the only edit needed; the
  redirects and buttons update themselves. Both the homepage CTA and the
  get/ page carry a QR code that points to https://localpulse.app/get.
- The site ships with a designed dark mode: phones and browsers in dark
  mode get a proper dark theme with the light-lettered logo automatically.
- The "Ask Pip" section includes a live interactive demo of the in-app
  assistant, running on sample data.
