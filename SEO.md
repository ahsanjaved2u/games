# GameVesta — SEO Guide

Everything about how SEO is set up and what to do when adding new content.

---

## Architecture Overview

SEO in this Next.js app is handled through:

1. **layout.jsx metadata** — Each route folder can have a `layout.jsx` that exports `metadata` (static) or `generateMetadata()` (dynamic). This sets the `<title>`, `<meta>`, OpenGraph, Twitter, and canonical tags.
2. **Structured Data (JSON-LD)** — Schema.org markup injected via `<script type="application/ld+json">` in layout files.
3. **sitemap.js** — Dynamic sitemap at `/sitemap.xml` that auto-includes all games.
4. **robots.js** — Controls which routes search engines can crawl.
5. **manifest.json** — PWA metadata for install prompts and app-like behavior.

---

## What's Currently Configured

### Root Layout (`src/app/layout.jsx`)
- Global metadata: title template `%s | GameVesta`, description, keywords, OG, Twitter cards
- `WebSite` JSON-LD with SearchAction
- `Organization` JSON-LD with logo plus contact point
- `theme-color`, `manifest.json` link, `preconnect` to API, `apple-touch-icon`

### Per-Page Metadata (via `layout.jsx` in each folder)

| Route | Title | Indexed | JSON-LD | Canonical |
|-------|-------|---------|---------|-----------|
| `/` | GameVesta — Play. Compete. Win. | Yes | WebSite, Organization | Yes |
| `/games` | All Games — Play & Earn | Yes | — | Yes |
| `/games/[slug]` | {Game Name} — Play & Earn/Compete | Yes | — | Yes |
| `/leaderboard` | Leaderboard — Top Players | Yes | — | Yes |
| `/about` | About Us | Yes | — | Yes |
| `/faq` | FAQ — Frequently Asked Questions | Yes | FAQPage (5 Q&As) | Yes |
| `/contact` | Contact Us | Yes | — | Yes |
| `/signup` | Sign Up — Start Earning | Yes | — | Yes |
| `/login` | Login | **No** | — | Yes |
| `/privacy-policy` | Privacy Policy | Yes | — | Yes |
| `/terms` | Terms of Service | Yes | — | Yes |
| `/dashboard/*` | — | **No** | — | — |
| `/profile` | My Profile | **No** | — | — |
| `/settings` | Settings | **No** | — | — |
| `/wallet` | Wallet | **No** | — | — |
| `/verify-email` | Verify Email | **No** | — | — |

### Dynamic Game Pages (`/games/[slug]`)
- `generateMetadata()` fetches game data from the API server-side
- Sets unique title, description, keywords, OG image, Twitter card per game
- Falls back to `/og-image.png` if no thumbnail is set
- Revalidates every 300 seconds (5 min)

### Sitemap (`src/app/sitemap.js`)
- Dynamically fetches all games from `/api/games` and includes `/games/{slug}` URLs
- Includes all static public pages
- Excludes private pages (profile, wallet, settings, dashboard, verify-email)
- Revalidates game list every 3600 seconds (1 hour)

### Robots (`src/app/robots.js`)
- Allows `/` for all user agents
- Disallows: `/dashboard/`, `/profile/`, `/wallet/`, `/settings/`, `/verify-email/`
- Points to `https://gamevesta.com/sitemap.xml`

### OpenGraph Image
- `/public/og-image.png` — used as default social sharing image across all pages
- Individual game pages use the game's thumbnail if available

---

## Adding a New Game — SEO Checklist

When you add a new game to the platform, follow these steps:

### 1. Game Data in Database
Ensure these fields are filled properly:
- **`name`** — Human-readable game name (appears in search results as title)
- **`slug`** — URL-friendly identifier (e.g. `bubble-shooter`)
- **`description`** — 1-2 sentence description (appears in search results). Max 160 chars is ideal for SEO.
- **`thumbnail`** — Relative path to an image inside the game folder (e.g. `images/thumbnail.png`). Recommended: 1200x630px for OG sharing.
- **`gameType`** — `rewarding` or `competitive` (used in auto-generated meta descriptions)

### 2. Game Files
Place game files in `/frontend/public/games/{slug}/`:
- `index.html`, `script.js`, `style.css`, etc.
- `images/thumbnail.png` (or whatever you set in the `thumbnail` field) — this becomes the OG/social image

### 3. Automatic SEO (No Manual Work Needed)
These happen automatically once the game is in the database:
- **Title tag**: `{Game Name} — Play & Earn | GameVesta` (or "Compete" for competitive)
- **Meta description**: Uses `description` field, or auto-generates one
- **Canonical URL**: `https://gamevesta.com/games/{slug}`
- **OpenGraph & Twitter cards**: Title, description, and thumbnail image
- **Sitemap entry**: Auto-included with `priority: 0.8`, `changeFrequency: weekly`

### 4. Optional: Game Thumbnail for Social Sharing
For best results on social media (Facebook, Twitter, Discord, WhatsApp):
- Create a **1200x630px** image showing the game in action
- Name it something like `images/thumbnail.png` inside the game folder
- Set the `thumbnail` field in the database to `images/thumbnail.png`
- If no thumbnail is set, the default GameVesta OG image is used

---

## Adding a New Static Page — SEO Checklist

1. **Create `src/app/{route}/page.jsx`** — Your page content
2. **Create `src/app/{route}/layout.jsx`** — Export metadata:
   ```jsx
   export const metadata = {
     title: 'Page Title',
     description: 'Description for search engines (max ~160 chars).',
     alternates: { canonical: 'https://gamevesta.com/{route}' },
     openGraph: {
       title: 'Page Title | GameVesta',
       description: 'OG description.',
       url: 'https://gamevesta.com/{route}',
     },
   };

   export default function PageLayout({ children }) {
     return children;
   }
   ```
3. **Add to sitemap** — Edit `src/app/sitemap.js` and add the URL to the static array
4. **If private page** — Add `robots: { index: false, follow: false }` to metadata AND add the route to `robots.js` disallow list

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/layout.jsx` | Root metadata, JSON-LD, head tags |
| `src/app/sitemap.js` | Dynamic XML sitemap |
| `src/app/robots.js` | Crawler rules |
| `src/app/games/[slug]/layout.jsx` | Per-game dynamic SEO |
| `src/app/{route}/layout.jsx` | Per-page static SEO |
| `public/og-image.png` | Default social sharing image |
| `public/manifest.json` | PWA manifest |
| `public/appLevelImages/logo.png` | Logo image |
| `src/app/icon.png` | Browser tab favicon |

---

## SEO Tips

- **Descriptions**: Keep under 160 characters. Include keywords naturally.
- **Titles**: Keep under 60 characters. Put important words first.
- **OG Images**: Always 1200x630px. Clear, eye-catching, include branding.
- **Canonical URLs**: Every public page should have one. Prevents duplicate content issues.
- **No duplicate content**: Each page should have unique title + description.
- **Internal linking**: Link between related pages (e.g. game pages link to leaderboard, FAQ links to contact).
- After deploying, submit sitemap to [Google Search Console](https://search.google.com/search-console).
