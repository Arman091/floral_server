import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  const filePath = join(__dirname, "floral-cart-service-account-key.json");
  serviceAccount = JSON.parse(readFileSync(filePath, "utf-8"));
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
