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

// Import checkCalendarSyncStatus dynamically
import('./src/lib/googleCalendar.js').then(async (mod) => {
  console.log("Checking Google Calendar sync status...");
  try {
    const status = await mod.checkCalendarSyncStatus();
    console.log("Sync Status Result:", JSON.stringify(status, null, 2));
  } catch (error) {
    console.error("Critical error while calling checkCalendarSyncStatus:", error);
  }
  process.exit(0);
}).catch(console.error);
