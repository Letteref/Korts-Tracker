# Korts — Tennis & Padel Tracker

> **No ref. No lies. Just Korts.**

A feature-rich single-page web app for tennis & padel with user authentication, club management, tournament brackets, group play, live scoring, 7 shareable stat card templates, and admin dashboard.

---

## 🚀 Deployment Guide

### Prerequisites

- [GitHub account](https://github.com) (free)
- [Vercel account](https://vercel.com) (free — sign up with GitHub)
- [Git](https://git-scm.com) installed on your computer

---

## Step 1: Install Git (if not installed)

Download and install Git from https://git-scm.com

Verify installation:
```bash
git --version
```

---

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in:
   - **Repository name:** `korts` (or `korts-app`)
   - **Description:** `Tennis & Padel Score Tracker — No ref. No lies. Just Korts.`
   - **Visibility:** Public (free) or Private
   - ✅ Check **Add a README file**
3. Click **Create repository**
4. Copy the repository URL (e.g., `https://github.com/YOUR_USERNAME/korts.git`)

---

## Step 3: Push Your Code to GitHub

Open terminal in the `tennis-padel-tracker` folder and run these commands:

```bash
# 1. Initialize git repository
git init

# 2. Add all files
git add .

# 3. First commit
git commit -m "Initial commit: Korts — Tennis & Padel Tracker"

# 4. Set main branch
git branch -M main

# 5. Connect to GitHub (replace YOUR_USERNAME with your actual username)
git remote add origin https://github.com/YOUR_USERNAME/korts.git

# 6. Push to GitHub
git push -u origin main
```

---

## Step 4: Deploy to Vercel

### 4a. Connect GitHub to Vercel

1. Go to https://vercel.com
2. Click **Sign Up** → choose **Continue with GitHub**
3. Authorize Vercel to access your GitHub account
4. You'll be redirected to the Vercel dashboard

### 4b. Import Your Repository

1. Click **Add New...** → **Project**
2. Find your `korts` repository in the list
3. Click **Import**
4. Configure the project:
   - **Framework Preset:** `Other`
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** *(leave empty — no build needed)*
   - **Output Directory:** *(leave empty)*
5. Click **Deploy**

### 4c. Wait for Deployment

- Vercel will deploy in ~10-20 seconds
- You'll see a ✅ **Congratulations!** screen
- Your app is live at: `https://korts.vercel.app`

---

## Step 5: Set Up Auto-Deploy

Vercel automatically deploys every time you push to GitHub. No extra setup needed!

```bash
# Make changes locally, then:
git add .
git commit -m "Your changes"
git push

# Vercel auto-deploys within ~15 seconds!
```

---

## Step 6 (Optional): Custom Domain

Want your own domain like `korts.app`?

1. Buy a domain (recommendations):
   - [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) — cheapest (~$9/year)
   - [Namecheap](https://www.namecheap.com) — frequent sales
   - [Porkbun](https://porkbun.com) — competitive pricing

2. In Vercel Dashboard:
   - Select your `korts` project
   - Go to **Settings** → **Domains**
   - Add your custom domain
   - Vercel gives you DNS records to configure

3. In your domain registrar (Cloudflare/Namecheap/etc.):
   - Add the DNS records Vercel provided
   - Wait 5-10 minutes for propagation

4. Done! Your app is live at `https://korts.app`

---

## Project Structure

```
tennis-padel-tracker/
├── index.html      # App screens and modals
├── style.css       # Dark theme, responsive styles
└── app.js          # All application logic
```

No build step, no dependencies — just 3 static files.

---

## Features

- 🔐 **Auth** — Register/Login, multi-user, role-based access
- 🏠 **Dashboard** — Welcome screen with mode cards and quick stats
- 🎾 **Live Match Scoring** — Full tennis/padel rules (deuce, tiebreak, sets)
- 🏆 **Tournament Mode** — Single elimination brackets with visual tree
- 👥 **Group Play** — "King of the court" rotation with countdown timer
- 🏟️ **Club System** — Create clubs, invite members, shared rosters
- 📊 **Admin Dashboard** — KPIs, charts, user/match management
- 📤 **7 Share Templates** — Canvas-rendered stat cards, export as PNG
- 📱 **Responsive** — Works on mobile and desktop
- 🎨 **Lucide Icons** — Consistent icon system throughout

---

## Tech Stack

- Vanilla HTML/CSS/JS (no framework)
- [Lucide Icons](https://lucide.dev) via CDN
- [Chart.js](https://chartjs.org) via CDN (admin dashboard)
- localStorage for data persistence
- Deployed on [Vercel](https://vercel.com) (free)

---

## License

MIT
