import admin from "firebase-admin";
import serviceAccount from "./floral-cart-service-account-key.json" with { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;