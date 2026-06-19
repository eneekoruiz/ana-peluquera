# AG Beauty Salon - Booking & CMS Platform

Booking and CMS platform for AG Beauty Salon in Donostia.

## What it includes

- public booking experience
- editable CMS and agenda management
- Google Calendar synchronization
- trilingual interface
- image upload and email flows

## Tech stack

- Vite and React
- Tailwind CSS and TypeScript
- Firebase
- Google Calendar API
- Resend

## Social preview

GitHub social preview asset: `public/og.png`

## Architecture

The application separates the public salon pages, booking flow and administration interface from privileged integrations. Browser components collect content and appointment changes, while server-side routes handle operations that require Firebase or Google Calendar credentials.

Firebase provides authentication and persistent salon data. The public pages and content dashboard read the same stored content, so editorial changes do not require changes to presentation components.

## Links

- DeepWiki: https://deepwiki.com/eneekoruiz/ana-peluquera
