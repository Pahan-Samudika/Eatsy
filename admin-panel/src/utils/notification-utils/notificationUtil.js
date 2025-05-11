import axios from "axios";
import { notificationAPI } from "../../services";

// Helper function for sending mails
const sendVerifiedNotification = async ({ to, receiverType}) => {
    const isRestaurant = receiverType === 'restaurant';
    const greeting = isRestaurant ? "Dear Restaurant Partner," : "Dear Delivery Partner,";
    const thanksMessage = isRestaurant ? "Thank you for partnering with Eatsy!" : "Thank you for working with Eatsy!";

      try {
          await axios.post(notificationAPI.SendNotification, {
              to,
              subject : "User Verified",
              text : `Your account has been verified.`,
              html : `<div style="font-family: Arial, sans-serif; color: #333; padding-left: 20px;">
                    <h3>${greeting}</h3>
                    <h3>We are pleased to inform that you account has been verified.</h3>
                    <h3>${thanksMessage}</h3>
                </div>`,
              metadata: {
                  service: "user-service",
                  type: "user-verified"
              }
          });
          console.log(`Notification sent to ${to}`);
      } catch (error) {
          console.error(`Failed to send notification to ${to}`, error.message);
      }
};

export { sendVerifiedNotification };