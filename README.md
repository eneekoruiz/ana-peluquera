# AG Beauty Salon - Booking & CMS Platform

A high-end, bespoke Full-Stack web application designed for **AG Beauty Salon** (Donostia, Spain). This project transitions a traditional local business into a fully digitalized ecosystem, featuring a senior-friendly UX, a trilingual interface (ES/EN/EU), and a smart booking engine.

## Project Objective
The goal of this application is twofold:
1. **For the Client:** Provide an ultra-minimalist, zero-friction booking experience ("Don't make me think" UX) accessible to all age demographics.
2. **For the Owner:** Serve as a "God-Mode" dynamic CMS and agenda manager. It eliminates the dependency on a developer, allowing the owner to live-edit text, swap images, and manage appointments directly from a smartphone.

## Core Features

* **Smart Booking Engine:** Complex services (like hair coloring) use a 3-phase algorithm (Active Work -> Wait/Processing -> Final Touch). The system automatically frees up the "Wait" phase on the public calendar so other clients can book short services in parallel.
* **Bidirectional Google Calendar Sync:** Google Calendar acts as the single source of truth. The app reads real-time availability and writes new appointments instantly via the Google Calendar API.
* **"God-Mode" Admin CMS:** A hidden, authenticated route (`/portal-reservado`) where the owner can perform full CRUD operations on services and products, toggle item visibility, and edit website copy on the fly.
* **Trilingual i18n:** Full support for Spanish, English, and Basque.
* **Automated Image Optimization:** Client-side image compression (<1MB) before Firebase Storage upload to ensure lightning-fast load times.
* **Operations & Convenience:** Integrated "Click-to-Call", one-click Google Maps navigation, and manual WhatsApp reminders generated straight from the Admin dashboard.

## Tech Stack

* **Frontend:** Vite (React), Tailwind CSS, TypeScript
* **Backend (APIs):** Next.js (Serverless), Firebase Admin SDK
* **Database & Auth:** Firebase (Auth, Firestore, Storage)
* **Integrations:** Google Calendar API v3, Cloudinary API, Vercel KV (Rate Limiting)
* **Email:** Resend
## Environment Variables

To run this project in production (Vercel), ensure the following variables are configured:

*   **PORTFOLIO_ORIGIN:** `https://eneko-ruiz.vercel.app` (The domain allowed to embed the app).
*   **ALLOWED_ORIGINS:** Comma-separated list of origins (e.g., `https://eneko-ruiz.vercel.app`).
*   **KV_URL / KV_REST_API_URL:** Required for production rate limiting (Vercel KV).
*   **FIREBASE_SERVICE_ACCOUNT_JSON:** Admin credentials.
*   **RESEND_API_KEY:** For professional emails.
*   **CLOUDINARY_API_SECRET:** For secure image deletion.
*   **GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI:** For Google Calendar OAuth2.
