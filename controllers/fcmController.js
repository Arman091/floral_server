import { sendNotification } from "../services/notificationService.js";

export const sendTestNotification = async (req, res) => {
  try {
    const { token } = req.body;
    const response = await sendNotification(
      token,
      "Floral Cart 🌸",
      "Test notification from backend"
    );

    res.json({
      success: true,
      response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};