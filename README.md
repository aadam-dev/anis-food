# Anis Food and Drink — Website

Static marketing website for Anis Food and Drink, Botwe, Accra, Ghana. No database; contact, reservations, and orders go via WhatsApp.

## Features

- **Menu**: Static menu from `src/data/menu.json` (edit file to update)
- **Contact**: Form opens WhatsApp with your message pre-filled
- **Reservations**: Form opens WhatsApp with reservation details pre-filled
- **Order**: Cart + checkout opens WhatsApp with order summary (payment integration later)
- **Gallery, About, Services**: Static content
- **Mobile-first**, Tailwind CSS v4, Next.js 16 (App Router)

## Tech Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- No database, no auth — static site
- Forms → WhatsApp links (pre-filled message)

## Prerequisites

- Node.js **20.9.0 or higher** (required by Next.js 16)

## Getting Started

1. **Install**
   ```bash
   npm install
   ```

2. **Environment** (optional)
   ```bash
   cp .env.example .env.local
   ```
   Set `NEXT_PUBLIC_SITE_URL` to your production URL (e.g. `https://aniseatery.com`).

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Build**
   ```bash
   npm run build
   npm start
   ```

## Updating the Menu

Edit `src/data/menu.json`: add or change categories and items. The menu page and homepage popular items update automatically.

## Contact / Reservations / Orders

All lead to WhatsApp (+233 55 250 1280) with a pre-filled message. No server storage. Update business details in `src/lib/constants.ts` (phone, address, hours, social links).

## Deployment

- **Build**: `npm run build` (Node 20.9+)
- **Start**: `npm start` (or set `PORT` for your host)
- **Env**: Set `NEXT_PUBLIC_SITE_URL` to your production URL for sitemap, robots, and metadata. No database or secrets required.
- Suitable for Vercel, Netlify, or any Node host (use `next start` or platform’s Next.js runtime).

## Contact

- +233 50 160 0160
- +233 55 250 1280 (WhatsApp)
