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
  console.log("Reading settings/admin from Firestore...");
  const adminDoc = await db.collection("settings").doc("admin").get();
  if (!adminDoc.exists) {
    console.error("settings/admin document does not exist!");
    process.exit(1);
  }
  
  const data = adminDoc.data();
  console.log("\n=== FIRESTORE SETTINGS/ADMIN ===");
  console.log("bookings_enabled:", data.bookings_enabled);
  console.log("today_closed:", data.today_closed);
  console.log("today_closed_date:", data.today_closed_date);
  console.log("vacation_ranges:", JSON.stringify(data.vacation_ranges, null, 2));
  console.log("hidden_categories:", data.hidden_categories);
  console.log("google_refresh_token exists:", !!data.google_refresh_token);
  
  console.log("\n=== STAFF SCHEDULES ===");
  if (data.staff) {
    data.staff.forEach(w => {
      console.log(`Worker: ${w.name} (${w.id})`);
      console.log(`  Skills: ${w.skills}`);
      console.log(`  Working Days (old): ${w.workingDays}`);
      if (w.schedule) {
        console.log(`  Schedule (new):`);
        w.schedule.forEach(s => {
          console.log(`    Day ${s.dayId}: Active=${s.isActive}, Hours=${s.hours ? JSON.stringify(s.hours) : 'None'}`);
        });
      } else {
        console.log(`  Schedule: (None configured)`);
      }
    });
  } else {
    console.log("No staff configured.");
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
