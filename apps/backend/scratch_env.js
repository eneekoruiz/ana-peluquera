import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

// Load .env.local manually
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    process.env[key] = value;
  }
});

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT_PATH in .env.local");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Import createBooking from our source (we can use dynamic import or require since we run in ESM)
// But wait, the source files are TS and use aliases like @/lib/firebaseAdmin.
// Since we want to test the built code, or compile/run it with node or ts-node,
// let's see: we can write a script that queries firebase directly or calls our API locally.
// Actually, wait! Is there a dev server running or can we run the API locally?
// The backend has "npm run dev" or we can run the test command or just check the code path.
// Wait! Let's examine what code is being run in createBooking:
// line 57 in bookingService.ts:
// const serviceDoc = await db.collection('services').doc(data.service_id).get();
// ...
// const lockRef = db.collection('booking_locks').doc(data.date);
// Wait! Line 120 in bookingService.ts:
// await db.runTransaction(async (transaction) => {
//   await transaction.get(lockRef);
//   const snapshot = await transaction.get(
//     db.collection('bookings')
//       .where('date', '==', data.date)
//       .where('status', '==', 'confirmed')
//   );
//   ...
// });
// Wait!!! "db.collection('bookings').where(...)" is a Query!
// In Firebase Admin SDK, can you pass a Query to `transaction.get(query)`?
// Let's check! In Firestore Transaction:
// `transaction.get(documentRef)` gets a single document.
// BUT `transaction.get(query)` gets all documents matching the query!
// Wait! Is `transaction.get(query)` supported in firebase-admin?
// Yes, `transaction.get(query)` is supported in Node.js firestore admin SDK.
// But wait! Is there any other place?
// Let's look at `createAppointment` in `googleCalendar.ts`:
// It calls `calendar.events.insert`.
// Let's check if the Google Calendar integration is failing.
// In `bookingService.ts`:
// ```
//   try {
//     const gcal = await createAppointment({
//       ...
//     });
//     await bookingRef.update({ googleEventId: gcal.eventId });
//   } catch (error: any) {
//     console.error("❌ Fallo Google Calendar:", error);
//     // Marcar error en Firebase
//     await bookingRef.update({ status: 'error', error: 'Google Sync Failed' });
//     ...
//     throw new Error("MAINTENANCE_MODE");
//   }
// ```
// Wait! If `createAppointment` fails (for example, if the access/refresh token for Google Calendar is expired/revoked, or if there's any API error),
// then `createBooking` catches it, updates the booking status to 'error', sends an admin alert, and throws `new Error("MAINTENANCE_MODE")`!
// If `createBooking` throws `new Error("MAINTENANCE_MODE")`, what does the POST route do?
// In `apps/backend/src/app/api/bookings/route.ts`:
// ```
//   } catch (error: any) {
//     if (error.message === "MAINTENANCE_MODE") {
//       return NextResponse.json({ error: "MAINTENANCE_MODE" }, { status: 503, headers });
//     }
//     return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500, headers });
//   }
// ```
// Wait! If it throws "MAINTENANCE_MODE", it returns a 503 status code, NOT 500!
// But the user got a 500 (Internal Server Error) status code!
// So it was NOT "MAINTENANCE_MODE"!
// Wait, if it was NOT "MAINTENANCE_MODE", then the error was thrown outside of that try-catch block, OR inside `createBooking` before or after that block, OR inside `createBooking` itself but not caught by the Google Calendar try-catch (e.g. during transaction or before).
// Let's list the potential places that could throw a 500 error:
// 1. SafeParse failed? No, if safeParse fails, it returns 400.
// 2. `createBooking` throws an error:
//    - `SERVICE_NOT_FOUND`
//    - `SLOT_OCCUPIED`
//    - Firestore transaction error
//    - `crypto.randomBytes` or hashToken error?
//    - Dayjs timezone/formatting error
// Let's check:
// Wait, if `createBooking` throws `SLOT_OCCUPIED` or `SERVICE_NOT_FOUND`, it goes to the catch block:
// ```
//   } catch (error: any) {
//     if (error.message === "MAINTENANCE_MODE") {
//       return NextResponse.json({ error: "MAINTENANCE_MODE" }, { status: 503, headers });
//     }
//     return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500, headers });
//   }
// ```
// Oh! So if `createBooking` throws `SLOT_OCCUPIED`, the error message is `SLOT_OCCUPIED`. This falls to the general catch, which returns status 500 with `{ error: 'SLOT_OCCUPIED' }`!
// Wait! If it returns status 500 with `{ error: 'SLOT_OCCUPIED' }`, then the console will print `POST https://agpeluqueria.vercel.app/api/bookings 500 (Internal Server Error)`!
// And the frontend `useCreateBooking` hook:
// ```typescript
//     onError: (error: any) => toast.error("Error: " + error.message)
// ```
// will display: "Error: SLOT_OCCUPIED".
// Wait, did the user see "Error: SLOT_OCCUPIED" or "Error: Fallo en el servidor"?
// In the user's message:
// `Reservation-XriTtlxc.js:11  POST https://agpeluqueria.vercel.app/api/bookings 500 (Internal Server Error) ME HA SEGUIDO SIN DEJAR HACER LA RESERVA, ESTO ES INACEPTABLE`
// Wait, is it because the slot is occupied? Or is it a real 500 internal server error?
// Let's find out! Let's write a script that runs the backend API call or runs the backend code locally with `ts-node` or `vite-node` or by making a request to the local server.
// Wait, can we start the backend dev server and make a POST request to it?
// Yes! Let's see. First, we need to know what ports/env variables are configured for backend.
// Let's check `apps/backend/package.json` to see the scripts.
