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
  console.log("Reading services from Firestore...");
  const snapshot = await db.collection("services").get();
  
  console.log(`Found ${snapshot.size} services. Inspecting for category 'masajes'...`);
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`Service ID: ${doc.id}, Name: ${data.name}, Category: ${data.category}`);
    if (data.category === 'masajes') {
      console.log(`Deleting service: ${data.name} (${doc.id})`);
      await db.collection("services").doc(doc.id).delete();
    }
  }
  
  // Also check if any staff has "masajes" skill and remove it
  console.log("\nChecking staff skills...");
  const adminDoc = await db.collection("settings").doc("admin").get();
  if (adminDoc.exists) {
    const data = adminDoc.data();
    let updated = false;
    if (data.staff) {
      const updatedStaff = data.staff.map(w => {
        if (w.skills && w.skills.includes("masajes")) {
          console.log(`Removing 'masajes' skill from worker ${w.name} (${w.id})`);
          updated = true;
          return {
            ...w,
            skills: w.skills.filter(s => s !== "masajes")
          };
        }
        return w;
      });
      if (updated) {
        await db.collection("settings").doc("admin").update({ staff: updatedStaff });
        console.log("Updated staff skills successfully.");
      }
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
