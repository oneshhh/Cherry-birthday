# Cherry birthday-card website

This is a static one-page site that can be deployed directly to Vercel. It has no database and no Supabase dependency.

The card maker extracts 28 individual transparent stickers from the root-level `kawaii-doodles.png` sheet in the browser. People can add duplicates, drag them anywhere on the card, resize and rotate them, change their layer order, delete them, and undo or redo edits. The completed card is rendered as a high-resolution PNG with the sender's name in the bottom-right corner.

## Preview locally

Serve this folder with any static web server. Opening `index.html` directly is not recommended because browsers restrict canvas image processing for local files.

## Connect the private Google Drive folder

1. Open [Google Apps Script](https://script.google.com), create a project, and paste in `google-apps-script.gs`. The supplied Drive folder ID is already configured.
2. Deploy it as a Web App. Set **Execute as** to yourself and **Who has access** to anyone.
3. Copy the `/exec` deployment URL into `config.js` as `window.CHERRY_DRIVE_ENDPOINT`.
4. Submit a test card before sharing the site.

If the endpoint is left empty, the page downloads the completed PNG instead. This makes the card editor testable before Google Drive is connected.

At midnight in India on October 17, 2026, the public page automatically replaces the card maker with a birthday thank-you celebration while keeping Cherry's facts visible. The Apps Script has the same submission cutoff; after changing the Apps Script code, create a new deployment version so the server-side cutoff takes effect.

## Deploy on Vercel

Import this folder as a new Vercel project. It is a plain static site, so it does not need a build command or output-directory setting.
