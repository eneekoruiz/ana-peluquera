import fs from 'fs';
import path from 'path';

// Load .env.local manually before importing firebase Admin
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

import { createBooking } from './src/lib/bookingService';
import { getDb } from './src/lib/firebaseAdmin';

async function test() {
  const db = getDb();
  // Get first service
  const serviceSnap = await db.collection('services').limit(1).get();
  if (serviceSnap.empty) {
    console.error("No services found in Firestore!");
    return;
  }
  const service = serviceSnap.docs[0];
  console.log("Using service ID:", service.id, "Name:", service.data().name);

  // Try to create booking
  try {
    const res = await createBooking({
      client_name: "Test User",
      client_email: "eneekoruiz@gmail.com",
      client_phone: "600000000",
      service_id: service.id,
      date: "2026-06-15", // use a future date
      start_time: "11:00",
      end_time: "12:00",
      notes: "Test reservation from script",
      lang: "es"
    });
    console.log("Booking created successfully:", res);
  } catch (error) {
    console.error("CRITICAL ERROR IN createBooking:", error);
  }
}

test().catch(console.error);
