import dataSource from "../config/database";
import { Notification } from "../entities/notification";
import { io } from "../socket/socket";

export class GlobalNotificationService {
  /**
   * Dispatches a notification to the database and emits it via WebSockets.
   * @param message The text message to display in the UI
   * @param type The type of notification (e.g. 'PASSWORD_CHANGE', 'PRODUCT_ADDED', 'SUBSCRIPTION_EXPIRED')
   * @param extra Optional extra fields supported by the Notification entity
   */
  static async sendNotification(
    message: string,
    type: string,
    extra?: { product_id?: number; branch_name?: string; quantity?: number }
  ) {
    try {
      const repo = dataSource.getRepository(Notification);
      
      const notification = await repo.save({
        message,
        type,
        product_id: extra?.product_id,
        branch_name: extra?.branch_name,
        quantity: extra?.quantity,
      });

      // Emit real-time event to connected clients
      if (io) {
        io.emit("new-notification", notification);
      }

      return notification;
    } catch (error) {
      console.error("Failed to send global notification:", error);
    }
  }
}
