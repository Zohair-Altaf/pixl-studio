# Pixl Studio Website

A static agency website (design inspired by the layout/typography language of the
"Capital" Webflow template) with a real admin panel backed by a database — built
on **Netlify Functions + Netlify Blobs**, so content and uploaded images (portfolio,
team photos, client logos) are live for every visitor immediately, from any device,
not just the admin's own browser.

Free to host. No credit card, no server to manage.

## What's in here

```
pixl-studio/
  index.html, work.html, contact.html    Public pages
  admin/                                   Admin panel (password-protected)
  assets/                                  CSS, JS, shared renderers
  data/content.json                        Default/starter content
  netlify/functions/                       The backend API (Node, serverless)
    content.js    GET/PUT the site's content (database-backed)
    upload.js     Accepts an image, stores it, returns a URL
    media.js      Serves uploaded images back
    login.js, logout.js, session.js   Admin authentication
  netlify.toml                             Netlify config
  package.json                             One dependency: @netlify/blobs
  serve.ps1                                Local static preview only (see note below)
```

## Deploying — step by step

You already have a GitHub account (**Zohair-Altaf**). Here's the whole path to a
live site. Total time: about 10 minutes, no installs required.

### 1. Put the code on GitHub

1. Unzip the project you were sent.
2. Go to **github.com/new** and create a new repository (e.g. name it `pixl-studio`).
   Leave it empty — don't check "Add a README".
3. On the new repo's page, click **uploading an existing file**.
4. Drag in every file and folder from the unzipped `pixl-studio` folder (including
   the `netlify`, `assets`, `admin`, and `data` folders) and click **Commit changes**.

   (If drag-and-drop of folders misbehaves in your browser, install
   [GitHub Desktop](https://desktop.github.com) instead — it's free, official, and
   lets you "Add local repository" and click **Publish repository** in two clicks.)

### 2. Create a free Netlify account and deploy

1. Go to **[app.netlify.com/signup](https://app.netlify.com/signup)** and choose
   **Sign up with GitHub** — no new password to create.
2. Click **Add new site → Import an existing project → Deploy with GitHub**.
3. Pick the `pixl-studio` repository.
4. Netlify will detect the settings from `netlify.toml` automatically — just click
   **Deploy**.
5. Wait ~1 minute for the first build. You'll get a live URL like
   `https://random-name-123.netlify.app` — that's your site, live, free, right now.

### 3. Turn on the admin panel

The admin panel needs two settings before it will work (this is what makes your
password real, instead of hardcoded in the code):

1. In your Netlify site, go to **Site configuration → Environment variables**.
2. Add:
   - `ADMIN_PASSWORD` — the password you'll type into `/admin/` to log in.
   - `ADMIN_SECRET` — any long random string (mash your keyboard for 40+ characters).
3. Go to **Deploys** and click **Trigger deploy → Deploy site** so the new
   variables take effect.
4. Visit `https://your-site.netlify.app/admin/` and log in with `ADMIN_PASSWORD`.

From here, every edit — text, portfolio projects, team photos, client logos,
testimonials — saves straight to the live database and appears on the site
instantly for everyone. No export/import step needed anymore.

### 4. (Optional) Give your site a nicer free name

Netlify's random name works fine, but you can pick your own for free:
**Site configuration → General → Site details → Change site name** → e.g.
`pixl-studio` (if available) → your URL becomes `pixl-studio.netlify.app`.

### 5. (Optional, later) A real domain like pixlstudio.com

Not free — registrars charge roughly $10-20/year — but adding one later is easy:
buy it from any registrar (Namecheap, Porkbun, Google Domains, etc.), then in
Netlify go to **Domain management → Add a domain** and follow the DNS instructions
it gives you. Takes about 10 minutes once purchased.

## Local preview (optional)

`serve.ps1` (Windows PowerShell, no install needed) serves the static pages so
you can preview design changes:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Open http://localhost:8080. Note: the **admin panel only works on the deployed
Netlify site** — it needs the serverless backend, which a plain static server
can't provide. Open `/admin/` on your `.netlify.app` URL instead.

## Making changes after deploying

Since the site is connected to your GitHub repo, any time you (or I) push new
code changes to that repo, Netlify automatically rebuilds and redeploys — no
manual re-upload needed. Content changes (text, images, portfolio, etc.) never
require a code change at all — those go through the admin panel and save to the
database directly.

## Customizing design

- Colors: edit from the admin panel's **Site Settings** tab, or directly in
  `assets/css/style.css` (`:root` variables `--primary`, `--bg`, `--text`).
- Fonts: Google Fonts import at the top of `style.css`.
- Layout/sections: each dynamic section is rendered by a function in
  `assets/js/main.js`.

## How the backend works (for reference)

- **Content** (all text, and references to images) is one JSON document stored
  in a Netlify Blobs store, read/written through `/api/content`.
- **Images** you upload are compressed client-side, sent to `/api/upload`, and
  stored as blobs; they're served back through `/api/media?id=...`.
- **Login** checks your password against the `ADMIN_PASSWORD` environment
  variable and issues a signed, HttpOnly session cookie (`/api/login`) — the
  password itself is never stored in the code or in the browser.
- Nothing here needs a separate database signup (Supabase, Mongo, etc.) —
  Netlify Blobs is bundled into every Netlify site for free.
