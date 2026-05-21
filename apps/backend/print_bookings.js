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

const db = admin.firestore();

async function main() {
  console.log("Reading latest bookings from Firestore...");
  const bookingsSnap = await db.collection("bookings")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  
  if (bookingsSnap.empty) {
    console.log("No bookings found.");
    process.exit(0);
  }

  console.log("\n=== LATEST 10 BOOKINGS ===");
  bookingsSnap.docs.forEach(doc => {
    const d = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  Client: ${d.client_name} (${d.client_phone}) - ${d.client_email}`);
    console.log(`  Service: ${d.service_name} (ID: ${d.service_id})`);
    console.log(`  Date/Time: ${d.date} ${d.start_time} - ${d.end_time}`);
    console.log(`  Status: ${d.status}`);
    if (d.error) console.log(`  Error: ${d.error}`);
    console.log(`  Created At: ${d.createdAt}`);
    console.log("-----------------------------------------");
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
