import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDaysRemaining } from '../utils/helpers';
import { PAYMENT_NOTIFICATION_DAYS } from '../utils/constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Payment Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B4D3E',
    });

    await Notifications.setNotificationChannelAsync('stock', {
      name: 'Stock Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    await Notifications.setNotificationChannelAsync('general', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return true;
};

/**
 * Schedule a local notification for a payment due date
 */
export const schedulePaymentReminder = async (
  entryId: string,
  repName: string,
  companyName: string,
  amount: number,
  dueDate: Date
): Promise<void> => {
  const daysLeft = getDaysRemaining(dueDate);

  // Schedule notifications at configured intervals
  for (const daysBefore of PAYMENT_NOTIFICATION_DAYS) {
    if (daysLeft > daysBefore && daysBefore >= 0) {
      const triggerDate = new Date(dueDate);
      triggerDate.setDate(triggerDate.getDate() - daysBefore);
      triggerDate.setHours(9, 0, 0, 0); // 9 AM

      if (triggerDate > new Date()) {
        let title: string;
        let body: string;

        if (daysBefore === 0) {
          title = '⚠️ Payment Due Today';
          body = `₹${amount.toLocaleString()} due to ${repName} (${companyName}) today.`;
        } else if (daysBefore === 1) {
          title = '🔔 Payment Due Tomorrow';
          body = `₹${amount.toLocaleString()} due to ${repName} (${companyName}) tomorrow.`;
        } else {
          title = `Payment Reminder — ${daysBefore} days left`;
          body = `₹${amount.toLocaleString()} due to ${repName} (${companyName}) in ${daysBefore} days.`;
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: 'payment_reminder', entryId },
            ...(Platform.OS === 'android' ? { channelId: 'payments' } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }
    }
  }

  // Also schedule overdue notifications
  for (const daysBefore of PAYMENT_NOTIFICATION_DAYS) {
    if (daysBefore < 0) {
      const triggerDate = new Date(dueDate);
      triggerDate.setDate(triggerDate.getDate() - daysBefore); // Adds days since negative
      triggerDate.setHours(9, 0, 0, 0);

      if (triggerDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔴 Payment Overdue by ${Math.abs(daysBefore)} days`,
            body: `₹${amount.toLocaleString()} overdue to ${repName} (${companyName}).`,
            data: { type: 'payment_overdue', entryId },
            ...(Platform.OS === 'android' ? { channelId: 'payments' } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }
    }
  }
};

/**
 * Schedule a low-stock alert
 */
export const scheduleLowStockAlert = async (
  medicineName: string,
  currentStock: number,
  reorderLevel: number
): Promise<void> => {
  if (currentStock <= reorderLevel) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📦 Low Stock Alert',
        body: `${medicineName} is running low (${currentStock} remaining). Reorder level: ${reorderLevel}.`,
        data: { type: 'low_stock' },
        ...(Platform.OS === 'android' ? { channelId: 'stock' } : {}),
      },
      trigger: null, // Immediate
    });
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
