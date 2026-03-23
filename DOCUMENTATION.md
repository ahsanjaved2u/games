# 🎮 GameZone Platform — Complete Documentation

> **Version:** 1.0  
> A comprehensive guide for **Players**, **Admins**, and **Developers** covering every aspect of the GameZone platform.

---

## Table of Contents

- [1. Platform Overview](#1-platform-overview)
- [2. Player Guide](#2-player-guide)
  - [2.1 Getting Started](#21-getting-started)
  - [2.2 Understanding Game Types](#22-understanding-game-types)
  - [2.3 Playing Games](#23-playing-games)
  - [2.4 Earning Money](#24-earning-money)
  - [2.5 Wallet & Withdrawals](#25-wallet--withdrawals)
  - [2.6 Leaderboards](#26-leaderboards)
  - [2.7 Profile](#27-profile)
- [3. Admin Guide](#3-admin-guide)
  - [3.1 Dashboard Overview](#31-dashboard-overview)
  - [3.2 Managing Games](#32-managing-games)
  - [3.3 Game Types Configuration](#33-game-types-configuration)
  - [3.4 Wallet & Withdrawals Management](#34-wallet--withdrawals-management)
  - [3.5 Claimable Summary](#35-claimable-summary)
  - [3.6 Request Logs](#36-request-logs)
  - [3.7 Navbar Admin Features](#37-navbar-admin-features)
- [4. Developer Guide](#4-developer-guide)
  - [4.1 Architecture Overview](#41-architecture-overview)
  - [4.2 Backend Setup & Configuration](#42-backend-setup--configuration)
  - [4.3 Database Models](#43-database-models)
  - [4.4 API Reference](#44-api-reference)
  - [4.5 Middleware](#45-middleware)
  - [4.6 Cron Jobs & Automation](#46-cron-jobs--automation)
  - [4.7 Email Notifications](#47-email-notifications)
  - [4.8 Frontend Architecture](#48-frontend-architecture)
  - [4.9 Authentication Flow](#49-authentication-flow)
  - [4.10 Game Runtime & SDK](#410-game-runtime--sdk)
  - [4.11 Building a New Game](#411-building-a-new-game)
  - [4.12 Deployment](#412-deployment)
- [5. Game Mechanics Deep Dive](#5-game-mechanics-deep-dive)
  - [5.1 Score Formula](#51-score-formula)
  - [5.2 Reward Period System](#52-reward-period-system)
  - [5.3 Competition Lifecycle](#53-competition-lifecycle)
  - [5.4 Auto-Credit & Best Score Logic](#54-auto-credit--best-score-logic)
- [6. Environment Variables](#6-environment-variables)
- [7. Troubleshooting](#7-troubleshooting)

---

# 1. Platform Overview

GameZone is a **real-money HTML5 gaming platform** where players can play browser-based games and earn **PKR (Pakistani Rupees)**. The platform supports two fundamental game types:

| Aspect | Rewarding Games | Competitive Games |
|--------|----------------|-------------------|
| **Concept** | Play to earn based on score | Compete against others for prizes |
| **Revenue** | Optional per-attempt cost | Entry fee per contest |
| **Payout** | Score × conversion rate → PKR | Fixed prize pool to top N players |
| **Timing** | Repeating reward periods | Fixed start/end schedule |
| **Plays** | Unlimited (each may cost) | Unlimited within contest window |

**Tech Stack:**
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Frontend:** Next.js 16 (App Router) + Tailwind CSS v4
- **Games:** HTML5 Canvas in iframes, communicating via postMessage
- **Auth:** JWT tokens stored in localStorage
- **Email:** Nodemailer (Gmail SMTP)
- **Theme:** Dark neon-cyberpunk (cyan, purple, pink accents)

---

# 2. Player Guide

## 2.1 Getting Started

### Creating an Account

1. Click **Sign Up** in the top navigation bar.
2. Enter your **Name**, **Email**, and **Password** (minimum 6 characters).
3. Confirm your password and click **Create Account**.
4. You'll be automatically logged in and redirected to the home page.

### Logging In

1. Click **Login** in the top navigation bar.
2. Enter your email and password.
3. Click **Login** — you'll be redirected to the home page.

### Navigation

- **Home** — Featured games carousel and live game grid
- **Games** — Browse all available games
- **Leaderboard** — View rankings across all games
- **About** — Platform information
- **Wallet** (balance badge in navbar) — Manage your earnings
- **Profile** (avatar dropdown) — Your stats and history

---

## 2.2 Understanding Game Types

### 🎁 Free Rewarding Games

- **No cost** to play.
- Your score is converted to **PKR** using a conversion rate (e.g., 10 points = PKR 1).
- Rewards reset on a **repeating cycle** (e.g., every 30 minutes, every day).
- Only your **best score** in each period counts for earnings.
- You can play unlimited times per period to improve your best score.

### 💰 Paid Rewarding Games

- Each attempt costs a small fee (e.g., PKR 2) deducted from your wallet.
- Higher earning potential — same conversion-rate system as free rewarding.
- Only your **best score** per period earns money.

### 🏆 Free Competitive Games

- **No entry fee** — join competitions for free.
- Fixed prize pool (e.g., 1st: PKR 500, 2nd: PKR 300, 3rd: PKR 100).
- Competition runs between scheduled start and end dates.
- Play unlimited times — only your **best score** counts.
- Prizes distributed automatically when competition ends.

### 💎 Paid Competitive Games

- Requires a **one-time entry fee** per contest (e.g., PKR 50).
- Larger prize pools funded by entry fees.
- Same rules as free competitive — play unlimited after paying.
- Entry fee covers the entire contest duration.

### How to Tell Game Types Apart

On each game card, you'll see badges:
- **FREE** — No cost to play
- **PKR X / attempt** — Per-play cost (paid rewarding)
- **Entry: PKR X** — One-time contest fee (paid competitive)
- **🏆** icon — Competitive game with prize pool
- **🎁** or cash icon — Rewarding game

---

## 2.3 Playing Games

### Step-by-Step

1. **Browse** games on the Home page or Games page.
2. **Click** on a game card to open it.
3. **Entry Gate** (paid competitive only): If the game has an entry fee, you'll see a gate screen showing the fee, your wallet balance, and a countdown timer. Click **Pay & Enter** to proceed.
4. **Instructions Screen**: Read the game instructions. For paid rewarding games, you'll see the attempt cost and your wallet balance here. Click **Start Game** (free) or **Pay & Play** (paid) to begin.
5. **Play!** The game loads in fullscreen. Use mouse/touch to play.
6. **Game Over**: When you finish, the SDK shows your score, rank, and a leaderboard. Click **Try Again** to play again.

### During Gameplay

- **HUD Bar** at the top shows: Score, Timer (if timed), PKR earned (if conversion enabled), Pause button, Leaderboard button.
- **Pause**: Click the pause icon to pause/resume.
- **Leaderboard**: Click the leaderboard icon to peek at rankings mid-game.

### Period & Competition Timers

- **Rewarding games**: A countdown shows when the current reward period ends. Your best score resets each period.
- **Competitive games**: A countdown shows when the competition ends. After it ends, prizes are distributed.

---

## 2.4 Earning Money

### Rewarding Games

Your score automatically converts to PKR using the game's **conversion rate**.

**Example:** If conversion rate = 10 (10 points per PKR 1):
- You score 150 points → you earn **PKR 15.00**
- You play again and score 200 → your earning updates to **PKR 20.00**
- You play again and score 180 → **no change** (200 is still your best)

Earnings are automatically credited to your wallet when your score is submitted. Only the **best score** per reward period earns money. When a new period starts, your score resets and you can earn again.

### Competitive Games

Prizes are fixed amounts set by the admin (e.g., 1st: PKR 500, 2nd: PKR 300, 3rd: PKR 100).

- Play as many times as you want during the competition window.
- Only your **best score** counts for final ranking.
- When the competition ends, the system automatically:
  1. Ranks all players by their best score.
  2. Credits prize money to the top N players' wallets.
  3. Unpublishes the game.

If a **minimum player threshold** is set and not met, prizes are **not distributed**.

---

## 2.5 Wallet & Withdrawals

### Checking Your Balance

Your wallet balance is always visible in the **navbar** (updates every 30 seconds). Click it to go to the full Wallet page.

### Wallet Page

- **Balance Card** — Shows your current PKR balance.
- **Transaction History** — Every credit, debit, and withdrawal is listed with:
  - Type icon (green ↗ for credit, red ↙ for debit, yellow ↻ for withdrawal)
  - Description (e.g., "Game reward — Bubble Shooter")
  - Amount
  - Status badge (completed, pending, rejected)
  - Date

### Requesting a Withdrawal

1. Go to **Wallet** page.
2. Enter the amount you want to withdraw (minimum PKR 0.01).
3. Click **Proceed to Payment Details**.
4. Choose your payment method:
   - **Bank Transfer** — Select your bank (27 Pakistani banks listed), enter account title and account number.
   - **EasyPaisa** — Enter account title and phone number.
   - **JazzCash** — Enter account title and phone number.
5. Click **Confirm Withdrawal**.
6. The amount is immediately deducted from your balance.
7. The request goes to the admin for approval.
8. You'll receive an **email notification** when approved or rejected.
9. If rejected, the amount is **refunded** to your wallet.

---

## 2.6 Leaderboards

### Player Summary View

Select "My Entries" to see your performance across all games:
- Each row shows: Game name, best score, rank, total plays, type, status.
- Filter by game type (Rewarding/Competitive), status (Active/Ended), or search by name.
- Click **Load More** for pagination.

### Game Leaderboard View

Select a specific game to see its full leaderboard:
- **Competitive games**: Switch between contest rounds using chips at the top.
- **Rewarding games**: Switch between reward periods.
- Each entry shows: Rank (with 🥇🥈🥉 for top 3), player name, score, points, time, attempts.
- Your own row is highlighted.

---

## 2.7 Profile

Your profile page shows:

- **Account Info** — Name, email, join date, avatar.
- **Gaming Stats** — Total plays, unique games played, competitive vs. rewarding breakdown.
- **Financial Summary** — Total won, total redeemed/paid, current balance, redemption rate.
- **Per-Game Breakdown** — Expandable list showing your performance in each game, with contest details for competitive games. Includes rank, score, total plays per contest/period.

---

# 3. Admin Guide

## 3.1 Dashboard Overview

Access the admin dashboard via **Dashboard** in your profile dropdown (visible only to admin accounts).

### Main Dashboard (`/dashboard`)

Shows 4 stat cards:
- **Total Requests** — All-time API requests logged.
- **Today's Requests** — Requests in the last 24 hours.
- **Unique Visitors** — Distinct IPs this week.
- **Active Users** — Logged-in users this week.

Below the stats is a **Users Table** showing all registered users:
- Avatar, Name, Email, Role (Admin/User badge), Active status, Join date.

Quick links to sub-pages: **Games**, **Logs**, **Claimables**, **Wallets**.

### Admin Profile (`/profile`)

When logged in as admin, the profile page shows platform-wide analytics:
- Total games, competitive/rewarding counts, live games count.
- Total contest rounds, total attempts (by type), total won/redeemed/balance.
- Redemption rate, pending withdrawals count.
- Top 5 games by attempts, top 5 players by balance.
- Games with no plays in 7 days (alerts).
- Contests ending in 24 hours (alerts).
- Prizes pending distribution (alerts).

---

## 3.2 Managing Games

### Accessing Game Management

Go to **Dashboard → Games** (`/dashboard/games`).

### Creating a New Game

Click the **+ Create New Game** button to open the form. The form is organized into sections:

#### 📋 Basic Info
| Field | Description |
|-------|-------------|
| **Game Name** | Display name (max 100 chars). Auto-generates slug. |
| **URL Slug** | URL-safe identifier (lowercase, hyphens). Must be unique. |
| **Game Path** | Folder name inside `public/games/` where game files live. |
| **Thumbnail Path** | Relative path to thumbnail within the game folder (e.g., `images/background.png`). |
| **Description** | Short description (max 500 chars). |
| **Tag** | Optional badge text (e.g., "Popular", "New", "Hot"). |
| **Accent Color** | Hex color for the game's theme (default: `#00e5ff`). |

#### 🎮 Type & Pricing
| Field | Description |
|-------|-------------|
| **Game Type** | `Rewarding` or `Competitive`. Changes which settings are shown. |
| **Pricing** | `Free` or `Paid`. Controls whether fee fields appear. |

#### 💰 Reward Settings (Rewarding games only)
| Field | Description |
|-------|-------------|
| **Conversion Rate** | How many points = PKR 1. E.g., `10` means 100 points = PKR 10. |
| **Show Currency in Game** | Toggle to display PKR earning in the game HUD. |
| **Reward Period** | Days + Hours + Minutes. Defines how often scores reset. E.g., 0d 0h 30m = every 30 minutes. |
| **Attempt Cost** | PKR per play (paid rewarding only). Leave 0 for free. |

#### 🏆 Competition Settings (Competitive games only)
| Field | Description |
|-------|-------------|
| **Entry Fee** | PKR entry fee (paid competitive only). Leave 0 for free. |
| **Prizes** | Add 1st, 2nd, 3rd (etc.) prize amounts in PKR. Click **+ Add Prize** to add positions. |
| **Min Players Threshold** | Minimum players required. If not met, prizes won't be distributed. 0 = no minimum. |

#### ⏱️ Timing & Publishing
| Field | Description |
|-------|-------------|
| **Has Time Limit** | Whether each play has a time limit. |
| **Time Limit (Seconds)** | Duration of each game session. |
| **Is Live** | Whether the game is publicly visible. For competitive games, this is auto-managed. |

#### 📅 Competition Schedule
| Field | Description |
|-------|-------------|
| **Schedule Start** | When the competition goes live (auto-publishes). |
| **Schedule End** | When the competition ends (auto-distributes prizes). |
| **Show Schedule** | Whether to display countdown on game card. |

#### 📖 Instructions
Add instruction cards that players see before starting:
- Each card has: **Icon** (emoji), **Title**, and **Text**.
- Click **+ Add Instruction** to add more.
- Click **×** to remove.

### Editing a Game

Click the **Edit** button on any game card. The same form appears with pre-filled data.

> **Important:** Changing reward period (days/hours/minutes) on a rewarding game will **reset the period anchor**. This means the current period restarts from now.

### Uploading Game Files

1. Click the **Upload ZIP** button on a game card.
2. Select a `.zip` file (max 50 MB) containing the game's HTML/JS/CSS files.
3. The system extracts it to the game's folder (`public/games/{gamePath}/`).
4. If `index.html` is inside a subfolder in the ZIP, it's automatically moved to the root.

### Toggling Live Status

Click the **toggle** switch on a game card to publish/unpublish it.

- **Competitive games** are auto-managed: they publish at `scheduleStart` and unpublish at `scheduleEnd`. Manually unpublishing sets a `manualUnpublish` flag to prevent auto-republishing.
- **Rewarding games** can be freely toggled.

### Ending a Competition Early

Click **End Competition Now** on a competitive game card. This:
1. Sets `scheduleEnd` to the current time.
2. Immediately distributes prizes to top-ranked players.
3. Unpublishes the game.
4. A confirmation modal appears first.

### Deleting a Game

Click **Delete** on a game card. A confirmation modal appears. This **permanently** removes the game from the database (game files in `public/games/` are NOT deleted).

---

## 3.3 Game Types Configuration

### Setting Up a Free Rewarding Game

1. Game Type: **Rewarding**
2. Pricing: **Free**
3. Set **Conversion Rate** (e.g., 10 = every 10 points earns PKR 1)
4. Set **Reward Period** (e.g., 0 days, 0 hours, 30 minutes)
5. Attempt Cost: **0** (or leave empty)
6. Toggle **Is Live** to publish

### Setting Up a Paid Rewarding Game

1. Game Type: **Rewarding**
2. Pricing: **Paid**
3. Set **Conversion Rate**
4. Set **Reward Period**
5. Set **Attempt Cost** (e.g., PKR 2 per play)
6. Toggle **Is Live** to publish

### Setting Up a Free Competitive Game

1. Game Type: **Competitive**
2. Pricing: **Free**
3. Entry Fee: **0**
4. Add **Prizes** (e.g., 500, 300, 100)
5. Set **Min Players Threshold** (optional)
6. Set **Schedule Start** and **Schedule End**
7. The game auto-publishes at schedule start

### Setting Up a Paid Competitive Game

1. Game Type: **Competitive**
2. Pricing: **Paid**
3. Set **Entry Fee** (e.g., PKR 50)
4. Add **Prizes**
5. Set **Min Players Threshold** (optional)
6. Set **Schedule Start** and **Schedule End**
7. The game auto-publishes at schedule start

---

## 3.4 Wallet & Withdrawals Management

### Accessing Wallet Management

Go to **Dashboard → Wallets** (`/dashboard/wallet`).

### All Wallets Tab

Shows every player's wallet:
- Player name, email, current balance.
- **Credit** button — Add money to a player's wallet (enter amount + description).
- **Debit** button — Remove money from a player's wallet.
- **View History** button — See that player's last 100 transactions.

### Pending Withdrawals Tab

Shows all withdrawal requests awaiting your action:
- Player name, amount, payment method details.
- **Payment Info**:
  - Bank: Account title, bank name, account number.
  - EasyPaisa/JazzCash: Account title, phone number.
- **Approve** — Marks the withdrawal as completed. Player receives email notification.
- **Reject** — Returns the money to the player's wallet. Player receives email notification.

---

## 3.5 Claimable Summary

Go to **Dashboard → Claimables** (`/dashboard/claimable`).

### Overview

Shows the total claimable amount across all players — this is the sum of all player wallet balances plus pending withdrawals.

### Player Breakdown Table

| Column | Meaning |
|--------|---------|
| **Player** | Name and email |
| **Won Amount** | Total PKR earned from all games |
| **Redeemed / Paid** | Total PKR withdrawn or debited |
| **Balance** | Current wallet balance |

Click any player row to see a **detailed breakdown** per contest/period:
- Game name, contest dates, rank, score, total plays, won amount, redeemed amount, remaining balance.
- Redeemed amounts are allocated FIFO (first-in-first-out) across contests.

---

## 3.6 Request Logs

Go to **Dashboard → Logs** (`/dashboard/logs`).

### Log Viewer

Every API request to the server is logged. The viewer shows:
- **Method** (GET/POST/PUT/DELETE/PATCH) with color coding.
- **URL** path.
- **Status Code** (green for 2xx, yellow for 4xx, red for 5xx).
- **IP** address.
- **Timestamp**.

Click a log entry to expand it and see:
- Full URL, User Agent, Referer, Response Time, Associated user (if logged in).

### Filters

- Filter by **HTTP method** (dropdown).
- **Pagination** with 30 entries per page.

### Stats

The main dashboard shows aggregate stats (total requests, today's requests, unique IPs, active users).

### Cleanup

Use the `DELETE /api/logs/cleanup` endpoint to remove logs older than 30 days.

---

## 3.7 Navbar Admin Features

As an admin, the navbar shows a **Claimable Badge** — the total PKR claimable amount across all players. Click it to go to the Claimable Summary page. This updates automatically.

---

# 4. Developer Guide

## 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     Frontend                         │
│    Next.js 16 (App Router) + Tailwind CSS v4         │
│    Port 3000                                         │
│                                                      │
│    ┌──────────┐  ┌──────────┐  ┌──────────────┐     │
│    │  Pages   │  │Components│  │   Context     │     │
│    │(App Dir) │  │(Shared)  │  │(AuthContext)  │     │
│    └────┬─────┘  └──────────┘  └──────┬───────┘     │
│         │                              │             │
│    ┌────┴──────────────────────────────┴────┐        │
│    │          Game iframes                   │        │
│    │   public/games/{slug}/index.html        │        │
│    │   ┌─────────┐ ┌───────────────────┐     │        │
│    │   │ hud.js  │ │ gamezone-sdk.js   │     │        │
│    │   └─────────┘ └───────────────────┘     │        │
│    └────────────────┬───────────────────┘    │
│                     │ postMessage             │
└─────────────────────┼───────────────────────┘
                      │ HTTP (fetch)
┌─────────────────────┼───────────────────────┐
│                  Backend                      │
│    Express.js + Mongoose                      │
│    Port 5000                                  │
│                                               │
│    ┌────────┐  ┌───────────┐  ┌──────────┐   │
│    │ Routes │→ │Controllers│→ │  Models   │   │
│    └────────┘  └───────────┘  └────┬─────┘   │
│    ┌──────────────┐                │          │
│    │  Middleware   │     ┌──────────┴───┐     │
│    │(auth,logger) │     │   MongoDB     │     │
│    └──────────────┘     └──────────────┘     │
│    ┌──────────────┐                           │
│    │  Cron Jobs   │ (every minute)            │
│    └──────────────┘                           │
└───────────────────────────────────────────────┘
```

### Project Structure

```
games/
├── backend/
│   ├── server.js              # Express app + cron jobs
│   ├── package.json
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── competitionController.js
│   │   ├── entryController.js
│   │   ├── gameController.js
│   │   ├── logController.js
│   │   ├── scoreController.js
│   │   ├── userController.js
│   │   └── walletController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT protect + admin guard
│   │   ├── errorHandler.js    # Global error handler
│   │   └── logger.js          # Request logging to DB
│   ├── models/
│   │   ├── Game.js
│   │   ├── GameEntry.js
│   │   ├── GameScore.js
│   │   ├── Log.js
│   │   ├── Transaction.js
│   │   ├── User.js
│   │   └── Wallet.js
│   ├── routes/
│   │   ├── entryRoutes.js
│   │   ├── gameRoutes.js
│   │   ├── logRoutes.js
│   │   ├── scoreRoutes.js
│   │   ├── userRoutes.js
│   │   └── walletRoutes.js
│   ├── seeds/
│   │   └── seedGames.js       # Seed initial game
│   └── utils/
│       ├── helpers.js         # asyncHandler
│       └── mailer.js          # Email notifications
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   │   ├── layout.jsx     # Root layout with AuthProvider
│   │   │   ├── globals.css    # Neon dark theme
│   │   │   ├── page.jsx       # Home page
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── about/
│   │   │   ├── games/
│   │   │   │   ├── page.jsx         # Games listing
│   │   │   │   └── [slug]/page.jsx  # Game play page
│   │   │   ├── leaderboard/
│   │   │   ├── profile/
│   │   │   ├── wallet/
│   │   │   └── dashboard/
│   │   │       ├── page.jsx         # Admin stats + users
│   │   │       ├── games/page.jsx   # Game CRUD
│   │   │       ├── wallet/page.jsx  # Wallet mgmt
│   │   │       ├── claimable/page.jsx
│   │   │       └── logs/page.jsx
│   │   ├── components/
│   │   │   ├── AdminRoute.jsx
│   │   │   ├── AttemptCostModal.jsx
│   │   │   ├── EntryFeeModal.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── GameCard.jsx
│   │   │   ├── GameInstructions.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── PaymentModal.jsx
│   │   └── context/
│   │       └── AuthContext.jsx
│   └── public/
│       ├── sdk/
│       │   └── gamezone-sdk.js    # Game SDK
│       └── games/
│           ├── GAME_DEV_GUIDE.md  # Game developer guide
│           ├── bubble-shooter/    # Sample game
│           └── ...                # Other game folders
└── DOCUMENTATION.md               # This file
```

---

## 4.2 Backend Setup & Configuration

### Prerequisites

- **Node.js** 18+
- **MongoDB** (local or Atlas)
- **npm**

### Installation

```bash
cd games/backend
npm install
```

### Environment Variables

Create a `.env` file in `backend/`:

```env
# Required
MONGO_URI=mongodb://localhost:27017/gamezone
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=30d
PORT=5000

# Email (optional — withdrawal notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM_NAME=GameZone
ADMIN_EMAIL=admin@example.com

# Game uploads (optional)
GAMES_UPLOAD_DIR=../../frontend/public/games
```

### Running

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

### Seeding

```bash
node seeds/seedGames.js
```

This creates a sample "Neon Bubble Shooter" game if it doesn't exist.

---

## 4.3 Database Models

### Game

The central model for all game metadata, scheduling, and monetization.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | String | required | Display name (max 100) |
| `slug` | String | required, unique | URL identifier (`[a-z0-9-]+`) |
| `description` | String | `''` | Short description (max 500) |
| `thumbnail` | String | `''` | Path to thumbnail image within game folder |
| `isLive` | Boolean | `false` | Publicly visible |
| `gamePath` | String | required | Folder name in `public/games/` |
| `instructions` | `[{icon, title, text}]` | `[]` | Pre-game instruction cards |
| `tag` | String | `''` | Badge text ("Popular", "New") |
| `color` | String | `'#00e5ff'` | Accent color hex |
| `gameType` | Enum | `'rewarding'` | `'rewarding'` or `'competitive'` |
| `conversionRate` | Number | `0` | Points per PKR 1 (rewarding) |
| `showCurrency` | Boolean | `false` | Show PKR in game HUD |
| `prizes` | `[Number]` | `[]` | Prize pool by rank (competitive) |
| `prizesDistributed` | Boolean | `false` | Whether prizes have been paid |
| `minPlayersThreshold` | Number | `0` | Min players for payout (0=off) |
| `hasTimeLimit` | Boolean | `false` | Per-play time limit |
| `timeLimitSeconds` | Number | `0` | Seconds per play |
| `scheduleStart` | Date | `null` | Auto-publish time |
| `scheduleEnd` | Date | `null` | Auto-end time |
| `showSchedule` | Boolean | `false` | Display countdown on card |
| `manualUnpublish` | Boolean | `false` | Prevents auto-publish |
| `activeContestId` | String | `null` | `{scheduleStart}_{scheduleEnd}` |
| `rewardPeriodDays` | Number | `0` | Period: days component |
| `rewardPeriodHours` | Number | `0` | Period: hours component |
| `rewardPeriodMinutes` | Number | `0` | Period: minutes component |
| `periodAnchor` | Date | `null` | Anchor for period cycle alignment |
| `entryFee` | Number | `0` | Entry fee (competitive) |
| `attemptCost` | Number | `0` | Per-attempt cost (rewarding) |

### User

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | String | required | Display name (max 50) |
| `email` | String | required, unique | Login email (lowercase) |
| `password` | String | required | Bcrypt hashed (select: false) |
| `role` | Enum | `'user'` | `'user'` or `'admin'` |
| `avatar` | String | `null` | Avatar URL |
| `isActive` | Boolean | `true` | Account status |
| `lastLogin` | Date | `null` | Last login timestamp |

**Methods:** `matchPassword(plain)` — bcrypt compare. `getSignedJwtToken()` — JWT generation.

### Wallet

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `user` | ObjectId → User | required, unique | 1:1 with User |
| `balance` | Number | `0` | Current PKR balance |

### Transaction

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `user` | ObjectId → User | required | Transaction owner |
| `type` | Enum | required | `'credit'`, `'debit'`, `'withdrawal'` |
| `amount` | Number | required | PKR amount (min 0.01) |
| `description` | String | `''` | Human-readable label |
| `game` | String | `''` | Game reference |
| `scheduleId` | String | `''` | Links to reward period |
| `status` | Enum | `'completed'` | `'completed'`, `'pending'`, `'rejected'` |
| `createdBy` | ObjectId → User | `null` | Admin who created it |
| `note` | String | `''` | Notes |
| `paymentMethod` | Object | — | `{method, bankName, accountTitle, accountNumber, phoneNumber}` |

### GameScore

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `user` | ObjectId → User | required | Player |
| `game` | String | required | Game slug |
| `contestId` | String | `null` | Contest round ID (competitive) |
| `contestStart` | Date | `null` | Contest start (competitive) |
| `contestEnd` | Date | `null` | Contest end (competitive) |
| `points` | Number | `0` | Raw game points |
| `time` | Number | `0` | Seconds played |
| `score` | Number | `0` | Calculated score |
| `periodStart` | Date | `null` | Reward period start (rewarding) |
| `totalPlays` | Number | `1` | Play count (incremented) |

**Best-score logic:** Per user + game + contestId (competitive) or periodStart (rewarding), only the highest score is stored. Subsequent plays increment `totalPlays` but only update score/points/time if the new score is higher.

### GameEntry

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `user` | ObjectId → User | required | Who paid |
| `game` | ObjectId → Game | required | Which game |
| `periodStart` | Date | required | Period the fee covers |
| `amountPaid` | Number | required | PKR paid |
| `paidAt` | Date | now | Payment timestamp |

**Unique compound index:** `{ user, game, periodStart }` — prevents double payment.

### Log

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `method` | Enum | required | HTTP method |
| `url` | String | required | Request URL |
| `ip` | String | required | Client IP |
| `userAgent` | String | `'unknown'` | Browser |
| `referer` | String | `null` | Referrer |
| `user` | ObjectId → User | `null` | Authenticated user |
| `statusCode` | Number | `null` | Response status |
| `responseTime` | Number | `null` | Response time (ms) |

---

## 4.4 API Reference

### Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/users/register` | Public | Create account → returns JWT |
| `POST` | `/api/users/login` | Public | Login → returns JWT |
| `GET` | `/api/users/me` | Private | Get current user profile |
| `PUT` | `/api/users/me` | Private | Update name/email/avatar |
| `GET` | `/api/users` | Admin | List all users |
| `GET` | `/api/users/admin/profile-summary` | Admin | Platform analytics dashboard |

### Game Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/games` | Public | List all live games |
| `GET` | `/api/games/:slug` | Public | Get game by slug |
| `GET` | `/api/games/admin/all` | Admin | List ALL games (incl. drafts) |
| `POST` | `/api/games` | Admin | Create game |
| `PUT` | `/api/games/:id` | Admin | Update game |
| `DELETE` | `/api/games/:id` | Admin | Delete game |
| `PATCH` | `/api/games/:id/toggle-live` | Admin | Toggle publish status |
| `PATCH` | `/api/games/:id/end-competition` | Admin | End competition + distribute prizes |
| `POST` | `/api/games/:id/upload` | Admin | Upload game ZIP (50MB max) |

### Score Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/scores` | Private | Submit score |
| `GET` | `/api/scores/leaderboard/:game` | Public | Game leaderboard |
| `GET` | `/api/scores/me` | Private | My scores (all games) |
| `GET` | `/api/scores/me/:game` | Private | My scores (specific game) |
| `GET` | `/api/scores/contests/:game` | Public | List contest periods |
| `GET` | `/api/scores/reward-periods/:game` | Public | List reward periods |
| `GET` | `/api/scores/period-remaining/:gameSlug` | Public | Time remaining in reward period |
| `GET` | `/api/scores/admin/contest-summary` | Admin | Cross-game contest summary |

### Entry Fee Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/entries/:slug/status` | Private | Check if entry fee paid |
| `POST` | `/api/entries/:slug/pay` | Private | Pay entry fee |
| `POST` | `/api/entries/:slug/pay-attempt` | Private | Pay per-attempt cost |

### Wallet Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/wallet` | Private | Balance + transactions |
| `GET` | `/api/wallet/balance` | Private | Balance only |
| `POST` | `/api/wallet/withdraw` | Private | Request withdrawal |
| `GET` | `/api/wallet/admin/all` | Admin | All player wallets |
| `GET` | `/api/wallet/admin/claimable-summary` | Admin | Claimable breakdown |
| `GET` | `/api/wallet/admin/claimable-summary/:userId/contests` | Admin | Per-player contest breakdown |
| `GET` | `/api/wallet/admin/transactions/:userId` | Admin | Player transaction history |
| `GET` | `/api/wallet/admin/withdrawals` | Admin | Pending withdrawals |
| `PATCH` | `/api/wallet/admin/withdrawals/:id` | Admin | Approve/reject withdrawal |
| `POST` | `/api/wallet/admin/credit` | Admin | Credit player wallet |
| `POST` | `/api/wallet/admin/debit` | Admin | Debit player wallet |

### Log Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/logs` | Admin | Paginated request logs |
| `GET` | `/api/logs/stats` | Admin | Aggregate stats |
| `DELETE` | `/api/logs/cleanup` | Admin | Delete logs older than 30 days |

### Health Check

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | Public | Server status check |

---

## 4.5 Middleware

### `protect` (auth.js)

Extracts the JWT from the `Authorization: Bearer <token>` header. Verifies it using `JWT_SECRET`. Attaches the full user document (minus password) to `req.user`. Returns **401** if token is missing or invalid.

### `admin` (auth.js)

Must be used after `protect`. Checks `req.user.role === 'admin'`. Returns **403** if not an admin.

### `logger` (logger.js)

Runs on **every request**. Creates a `Log` document in MongoDB with: HTTP method, URL, IP, user agent, referer, authenticated user (if any). Hooks into `res.on('finish')` to capture status code and response time. Errors are caught silently to avoid breaking the request.

### `errorHandler` (errorHandler.js)

Global Express error handler (4-argument middleware). Handles:
- **CastError** (invalid ObjectId) → 400
- **Duplicate key** (MongoDB code 11000) → 400 with field name
- **ValidationError** → 400 with combined messages
- **Default** → 500 with stack trace in development

---

## 4.6 Cron Jobs & Automation

A `node-cron` job runs **every minute** and handles four tasks:

### Step 1: Auto-Publish Rewarding Games

Finds rewarding games with `isLive: false` and `scheduleStart <= now`. Sets `isLive: true` if `manualUnpublish` is not set.

### Step 2: Force-Unpublish Early Competitive Games

Finds competitive games that are live but `scheduleStart > now`. Sets `isLive: false` to prevent premature access.

### Step 3: Auto-Publish Competitive Games

Finds competitive games where `scheduleStart <= now <= scheduleEnd` and `prizesDistributed: false`. If not manually unpublished, sets `isLive: true` and computes `activeContestId`.

### Step 4: Auto-End + Prize Distribution

Finds competitive games where `scheduleEnd <= now` and `prizesDistributed: false`. Calls `distributeGamePrizes()` which:
1. Fetches top N scores (where N = number of prizes).
2. Checks `minPlayersThreshold` — skips if not met.
3. Credits each winner's wallet and creates transaction records.
4. Marks `prizesDistributed: true`.
5. Sets `isLive: false`.

---

## 4.7 Email Notifications

Three automated email templates (neon-styled HTML), sent via nodemailer:

1. **Withdrawal Request → Admin**: When a player requests withdrawal. Includes player info and payment details.
2. **Withdrawal Approved → Player**: When admin approves a withdrawal.
3. **Withdrawal Rejected → Player**: When admin rejects a withdrawal (refunded).

Emails are **fire-and-forget** — if email config is missing or sending fails, it's logged but doesn't break the flow.

---

## 4.8 Frontend Architecture

### Next.js App Router

All pages are in `src/app/` using Next.js App Router conventions. Each directory with a `page.jsx` is a route.

### Styling

- **Tailwind CSS v4** with `@tailwindcss/postcss` plugin.
- **Global CSS** (`globals.css`) defines:
  - CSS custom properties for the neon dark theme.
  - Custom scrollbar styles.
  - Utility classes: `.glass-card`, `.btn-neon`, `.btn-neon-primary`, `.neon-text-cyan`, etc.
  - Animations: `float`, `pulse-neon`, `fadeInUp`, `shimmer`.

### Key Design Patterns

- **`'use client'`** — All pages are client components (no SSR).
- **`authFetch()`** — Centralized authenticated fetch from AuthContext. Auto-attaches Bearer token and JSON headers.
- **30-second polling** — Many pages poll `/api/games` every 30 seconds for live updates. Balance polls via AuthContext.
- **Responsive design** — Desktop tables convert to card layouts on mobile. 1/2/3 column grids.
- **Per-endpoint fallbacks** — Admin pages like Claimable and Profile have `buildFallback*()` functions that aggregate data from multiple endpoints if the primary endpoint fails. This prevents a single API failure from blanking the entire page.

---

## 4.9 Authentication Flow

```
1. User submits login form
   ↓
2. Frontend calls POST /api/users/login
   ↓
3. Backend validates credentials, returns { token, user }
   ↓
4. Frontend stores token in localStorage as 'gz_token'
   Frontend stores user in localStorage as 'gz_user'
   ↓
5. AuthContext provides: user, token, isLoggedIn, isAdmin
   authFetch() auto-attaches "Authorization: Bearer <token>"
   ↓
6. Balance polling starts (GET /api/wallet/balance every 30s)
   ↓
7. On logout: localStorage cleared, state reset, redirect to /login
```

### Protected Routes

- **`AdminRoute`** component wraps all `/dashboard/*` pages. Redirects non-admin users to `/`.
- **Backend**: `protect` middleware validates JWT. `admin` middleware checks role.

---

## 4.10 Game Runtime & SDK

### How Games Run

Games are static HTML5 files served from `public/games/{gamePath}/`. When a player starts a game:

1. The play page (`/games/[slug]`) creates an `<iframe>` pointing to `/{gamePath}/index.html`.
2. The game loads `hud.js` (HUD bar), `gamezone-sdk.js` (SDK), and `script.js` (game logic).
3. Communication between the iframe and parent page happens via `postMessage`.

### postMessage Protocol

| Direction | Message Type | Payload | Purpose |
|-----------|-------------|---------|---------|
| Game → Parent | `REQUEST_LEADERBOARD` | — | Game requests leaderboard data |
| Game → Parent | `REQUEST_GAME_CONFIG` | — | Game requests config (conversion rate, time limit) |
| Game → Parent | `GAME_OVER` | `{ points, time }` | Game ended, submit score |
| Game → Parent | `TRY_AGAIN` | — | Player wants to play again |
| Parent → Game | `LEADERBOARD_DATA` | `{ entries }` | Leaderboard response |
| Parent → Game | `GAME_CONFIG` | `{ conversionRate, showCurrency, hasTimeLimit, timeLimitSeconds }` | Config response |

### SDK Public API

```javascript
// Initialize
GameZone.init({ /* options */ });

// When game ends
GameZone.gameOver(points, timeInSeconds);

// Draw game over screen (auto-called by gameOver)
GameZone.drawGameOver();

// Restart game (sends TRY_AGAIN to parent)
GameZone.restart();

// Leaderboard controls
GameZone.toggleLeaderboard();
GameZone.openLeaderboard();
GameZone.closeLeaderboard();
GameZone.onLeaderboardOpen(callback);
GameZone.onLeaderboardClose(callback);

// Utility
GameZone.calcScore(points, time); // Calculate score
GameZone.formatTime(seconds);      // Format MM:SS
GameZone.requestData();             // Request config + leaderboard

// Read-only getters
GameZone.isGameOver;       // boolean
GameZone.isLeaderboardOpen; // boolean
GameZone.entries;           // leaderboard entries array
```

### Score Calculation Formula

$$\text{score} = \text{points} \times \left(1 + \frac{\max(0,\ 120 - \text{time})}{600}\right)$$

- Completing faster (under 120 seconds) gives a bonus.
- Maximum bonus is +20% (at 0 seconds).
- No bonus after 120 seconds — score equals points.

---

## 4.11 Building a New Game

### Quick Start

1. Create a folder in `public/games/your-game-name/`.
2. Copy `hud.js` from an existing game (e.g., `bubble-shooter/hud.js`).
3. Create `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Game</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="game-container">
    <div id="game-wrapper">
      <canvas id="gameCanvas"></canvas>
    </div>
  </div>
  <script src="background.js"></script>
  <script src="hud.js"></script>
  <script src="/sdk/gamezone-sdk.js"></script>
  <script src="script.js"></script>
</body>
</html>
```

4. Create `script.js` with your game logic.
5. Register the game in the admin dashboard.

### Required Elements

- **HTML**: Must have `#game-container > #game-wrapper > #gameCanvas`.
- **Script load order**: `hud.js` → SDK → your `script.js`.
- **Score submission**: Call `GameZone.gameOver(points, timeSeconds)` when game ends.
- **Restart function**: Implement `restartGame()` that resets **all** game state.

### HUD API

```javascript
// Add custom stat to HUD bar
GameHUD.addStat('<span>Lives: <b>3</b></span>');

// Update displayed score
GameHUD.updateScore(150);

// Reset HUD
GameHUD.reset();

// Check time limit settings
GameHUD.hasTimeLimit;      // boolean
GameHUD.timeLimitSeconds;  // number
```

### Canvas Scaling

Use a reference width and scale factor for resolution-independent rendering:

```javascript
const REF_WIDTH = 480;
let S_factor;

function resize() {
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  canvas.width = w;
  canvas.height = h;
  S_factor = w / REF_WIDTH;
}

function S(val) { return val * S_factor; }
```

### Timing

Use `performance.now()` for precise timing:

```javascript
let lastTime = performance.now();

function gameLoop(now) {
  let dt = (now - lastTime) / 1000;
  dt = Math.min(dt, 0.05); // Cap at 50ms to prevent jumps
  lastTime = now;
  
  if (!paused) {
    update(dt);
    draw();
  }
  
  requestAnimationFrame(gameLoop);
}
```

### Pause System

Support a `pauseBtn` element (created by hud.js):

```javascript
const pauseBtn = document.getElementById('pauseBtn');
if (pauseBtn) {
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    if (!paused) lastTime = performance.now();
  });
}
```

### Audio

```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Unlock on first interaction
document.addEventListener('click', () => audioCtx.resume(), { once: true });

async function loadSound(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(buffer);
}

function playSound(buffer) {
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);
}
```

### Registering in Admin Dashboard

After creating game files, go to Dashboard → Games → Create New Game. Fill in:

1. **Game Name**: Your game's display name.
2. **Game Path**: Folder name (e.g., `your-game-name`).
3. **Game Type**: Rewarding or Competitive.
4. Configure pricing, rewards/prizes, timing per game type.
5. Add **Instructions** (icon + title + text for each card).
6. Set **Is Live** to publish.

Alternatively, ZIP your game folder and use the **Upload ZIP** feature on an existing game to update files.

### Shipping Checklist

1. ✅ `index.html` with correct structure and script order
2. ✅ `hud.js` copied from reference game
3. ✅ Canvas id is `gameCanvas`
4. ✅ `GameZone.gameOver(points, time)` called on game end
5. ✅ `restartGame()` resets ALL state (scores, timers, entities)
6. ✅ Pause button works
7. ✅ Canvas responsive (fills container, scales with `S()`)
8. ✅ Touch + mouse input both work
9. ✅ No console errors
10. ✅ Audio uses AudioContext with unlock
11. ✅ Timer pauses correctly
12. ✅ Score popups/effects don't persist after restart
13. ✅ Game registered in admin dashboard
14. ✅ Thumbnail path set
15. ✅ Instructions added
16. ✅ Tested on mobile and desktop

---

## 4.12 Deployment

### Backend

1. Set all environment variables (see [Section 6](#6-environment-variables)).
2. Ensure MongoDB is accessible.
3. Run `npm start` (or use PM2, Docker, etc.).

### Frontend

```bash
cd games/frontend
npm install
npm run build    # Production build
npm start        # Start production server
```

Or for development:

```bash
npm run dev      # Starts on port 3000 with Turbopack
```

### CORS

By default, the backend allows all origins (`cors()` with no options). For production, configure allowed origins:

```javascript
app.use(cors({ origin: 'https://yourdomain.com' }));
```

### Static Game Files

Games are served from `frontend/public/games/`. In production:
- Next.js serves `public/` as static files.
- The backend's upload feature extracts ZIPs to this directory.
- Ensure the backend has write access to `frontend/public/games/` if using ZIP upload.

---

# 5. Game Mechanics Deep Dive

## 5.1 Score Formula

The SDK calculates scores with a time bonus:

$$\text{score} = \text{points} \times \left(1 + \frac{\max(0,\ 120 - \text{time})}{600}\right)$$

| Time (seconds) | Bonus Multiplier | Example (100 points) |
|----------------|-----------------|---------------------|
| 0 | 1.20 (maximum) | 120 |
| 30 | 1.15 | 115 |
| 60 | 1.10 | 110 |
| 90 | 1.05 | 105 |
| 120 | 1.00 (no bonus) | 100 |
| 180 | 1.00 (no bonus) | 100 |

**Key insight**: Points are what the game awards. Score is what's used for ranking. For rewarding games, score (not points) is multiplied by conversion rate to calculate PKR earnings.

## 5.2 Reward Period System

Rewarding games reset scores on a repeating cycle. The period is defined by three fields:

```
Total Period (ms) = (days × 86400 + hours × 3600 + minutes × 60) × 1000
```

### Period Anchor

Each game has a `periodAnchor` — the reference point from which all periods are calculated:

```
elapsed = now - anchor
currentPeriodStart = anchor + Math.floor(elapsed / periodMs) × periodMs
currentPeriodEnd = currentPeriodStart + periodMs
```

The anchor is set when:
- A game is **created** (set to creation time).
- The reward period is **changed** in the admin dashboard (reset to update time).

### Example

- Anchor: 2:00 PM
- Period: 30 minutes
- Current time: 2:47 PM
- Elapsed: 47 minutes
- Current Period Start: 2:00 + floor(47/30) × 30 = 2:00 + 30 = **2:30 PM**
- Current Period End: **3:00 PM**
- Next reset in: **13 minutes**

### What Happens Each Period

1. Players' scores are isolated by `periodStart`.
2. The leaderboard shows only the current period's scores.
3. Wallet credits are per-period — credited when a new best score is set.
4. When the period resets, everything starts fresh.

## 5.3 Competition Lifecycle

```
┌──────────────┐   scheduleStart   ┌──────────────┐   scheduleEnd   ┌────────────────┐
│   Upcoming   │ ─────────────────→│    Active     │ ──────────────→ │     Ended      │
│  (not live)  │   auto-publish    │   (is live)   │  auto-unpublish │ (prizes paid)  │
└──────────────┘                   └──────────────┘                  └────────────────┘
```

1. **Upcoming**: Game created with future `scheduleStart`. Shows countdown on card if `showSchedule` enabled.
2. **Active**: Cron job auto-publishes when `scheduleStart` arrives. Players can join (pay entry fee if required) and play. `activeContestId` is computed as `{scheduleStart}_{scheduleEnd}`.
3. **Ended**: Cron job detects `scheduleEnd` has passed. Calls `distributeGamePrizes()`:
   - Fetches top N scores for this `activeContestId`.
   - Checks `minPlayersThreshold`.
   - Credits winners' wallets with corresponding prize amounts.
   - Creates transaction records with ordinal descriptions ("1st place", "2nd place", etc.).
   - Sets `prizesDistributed: true`, `isLive: false`.

### Manual End

Admin can click **End Competition Now** to immediately:
- Set `scheduleEnd = now`.
- Distribute prizes.
- Unpublish the game.

## 5.4 Auto-Credit & Best Score Logic

### Score Submission Flow

When a score is submitted (`POST /api/scores`):

```
1. Validate: Is game live? Is user authenticated?
   ↓
2. Entry fee check:
   - Competitive + entryFee > 0 → Must have paid entry
   - Rewarding + attemptCost > 0 → Cost already deducted at play start
   ↓
3. Determine context:
   - Competitive → contestId, contestStart, contestEnd
   - Rewarding → periodStart (from anchor calculation)
   ↓
4. Find existing score for this user + game + context
   ↓
5. If no existing score → Create new GameScore document
   If existing score:
     - If new score > existing → Update score, points, time
     - If new score ≤ existing → Only increment totalPlays
   ↓
6. Auto-credit (rewarding games with conversionRate > 0):
   - PKR = score / conversionRate
   - Calls creditRewardingGame() which:
     a. Finds existing "Game reward" transaction for this user+game+period
     b. If new PKR > existing → Updates transaction amount (adds delta to wallet)
     c. If new PKR ≤ existing → No change
   ↓
7. Return: rank, totalPlays, bestScore, walletCredited flag, periodEndsAt
```

### Why "Best Score Only"?

- **Fairness**: Players can't inflate earnings by playing many times.
- **Encouragement**: Players keep trying to beat their best.
- **Economy**: Predictable cost for the platform.

---

# 6. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Secret for JWT signing |
| `JWT_EXPIRE` | Yes | — | JWT expiration (e.g., `30d`) |
| `PORT` | No | `5000` | Backend port |
| `NODE_ENV` | No | — | `development` for verbose logging |
| `EMAIL_HOST` | No | `smtp.gmail.com` | SMTP host |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_SECURE` | No | `false` | Use TLS |
| `EMAIL_USER` | No | — | SMTP username |
| `EMAIL_PASS` | No | — | SMTP password (app password for Gmail) |
| `EMAIL_FROM_NAME` | No | `GameZone` | Sender display name |
| `ADMIN_EMAIL` | No | — | Admin email for notifications |
| `GAMES_UPLOAD_DIR` | No | `../../frontend/public/games` | Where ZIP uploads extract to |

---

# 7. Troubleshooting

### "Failed to open database" / Turbopack cache error

**Symptom**: Next.js dev server crashes with "invalid digit found in string".  
**Fix**: Delete the `.next` folder and restart:
```bash
cd frontend
rm -rf .next
npm run dev
```

### Game iframe not loading

**Check**:
1. `gamePath` in database matches the folder name in `public/games/`.
2. The folder contains `index.html`.
3. `hud.js` and other scripts are present.
4. No CORS errors in browser console.

### Scores not saving

**Check**:
1. User is logged in (JWT token valid).
2. Game `isLive` is true.
3. For competitive: entry fee has been paid for this contest.
4. For rewarding with `attemptCost`: attempt cost was deducted.
5. Backend server is running and accessible.

### Wallet balance not updating

**Check**:
1. AuthContext polls `/api/wallet/balance` every 30 seconds.
2. Force refresh by navigating away and back.
3. Check backend logs for errors on the balance endpoint.
4. Verify wallet document exists for the user in MongoDB.

### Reward period countdown seems wrong

**Check**:
1. `periodAnchor` is set on the game document.
2. `rewardPeriodDays/Hours/Minutes` are properly configured.
3. If you changed the period, the anchor resets — countdown starts from now.

### Prizes not distributing

**Check**:
1. `scheduleEnd` has passed.
2. `prizesDistributed` is still `false`.
3. `minPlayersThreshold` is met (or set to 0).
4. Cron job is running (check server logs).
5. Players have scores with the correct `contestId`.

### Email notifications not sending

**Check**:
1. `EMAIL_USER` and `EMAIL_PASS` are set in `.env`.
2. For Gmail: use an **App Password** (not regular password). Enable 2FA first.
3. Check server logs for nodemailer errors.
4. Emails are fire-and-forget — failures don't cause API errors.

### Admin dashboard showing empty data

**Check**:
1. You're logged in as an admin (role: `admin`).
2. The admin endpoints use per-endpoint fallbacks — if the primary endpoint fails, it tries building data from multiple other endpoints.
3. Check browser console for specific API errors.

---

> **GameZone Platform Documentation v1.0**  
> Generated for platform owners, administrators, developers, and players.
