import admin from "../config/firebaseAdmin.js";

export const sendNotification = async (token, title, body, data = {}) => {
  const message = {
    token,
    notification: {
      title,
      body,
    },
    data,
  };

  const response = await admin.messaging().send(message);

  console.log("Notification sent:", response);
  return response;
};
