# AG Beauty Salon - Booking & CMS Platform  Booking and CMS platform for AG Beauty Salon in Donostia.  ## What it includes  - public booking experience - editable CMS and agenda management - Google Calendar synchronization - trilingual interface - image upload and email flows  ## Tech stack  - Vite and React - Tailwind CSS and TypeScript - Firebase - Google Calendar API - Resend  ## Social preview  GitHub social preview asset: `public/og.png`  ## Links  - DeepWiki: https://deepwiki.com/eneekoruiz/ana-peluquera 

 ## Architecture

The Next.js application groups the public salon pages, booking flow and administration interface in one deployment. UI components collect booking and content changes, while server-side routes handle operations that require privileged Firebase or Google Calendar access.

Firebase provides authentication and persistent salon data. Calendar synchronization is kept behind server-side integration code so browser bundles do not receive service credentials. The content dashboard and public pages read the same stored content, which lets non-code changes appear without rebuilding the presentation layer. 
