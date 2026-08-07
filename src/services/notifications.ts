import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { Batch, Purchase } from "../types/models";
import { formatMoney } from "../utils/format";

const isExpoGo = Platform.OS !== "web" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function getNotifications(): any | null {
  if (isExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-notifications");
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

const Notifications = getNotifications();

if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn("Failed to set notification handler:", e);
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("dues", {
      name: "Payment dues",
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync("lowstock", {
      name: "Low stock",
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync("expiry", {
      name: "Medicine expiry",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

const REMINDER_DAYS = [10, 5, 1, 0];

/** Schedule local reminders for a purchase due date (10/5/1 days before + due day). */
export async function scheduleDueReminders(purchase: Purchase): Promise<void> {
  if (!Notifications) return;
  const ok = await ensureNotificationPermission().catch(() => false);
  if (!ok) return;
  const due = purchase.dueDate.toDate();
  const outstanding = purchase.totalAmount - (purchase.paidAmount || 0);
  if (outstanding <= 0) return;

  for (const daysBefore of REMINDER_DAYS) {
    const fireAt = new Date(due);
    fireAt.setDate(fireAt.getDate() - daysBefore);
    fireAt.setHours(9, 0, 0, 0);
    if (fireAt <= new Date()) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `due_${purchase.id}_${daysBefore}`,
      content: {
        title: daysBefore === 0 ? "Payment due today" : `Payment due in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`,
        body: `${formatMoney(outstanding)} to ${purchase.supplierName}${purchase.invoiceNo ? ` (Inv ${purchase.invoiceNo})` : ""}`,
        data: { purchaseId: purchase.id },
        ...(Platform.OS === "android" ? { channelId: "dues" } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  }
}

/** Cancel reminders once a purchase is fully paid. */
export async function cancelDueReminders(purchaseId: string): Promise<void> {
  if (!Notifications) return;
  for (const d of REMINDER_DAYS) {
    await Notifications.cancelScheduledNotificationAsync(`due_${purchaseId}_${d}`).catch(() => { });
  }
}

/** Fire an immediate local notification that a medicine has hit its reorder level. */
export async function notifyLowStock(
  medicineId: string,
  medicineName: string,
  qty: number,
  unit: string
): Promise<void> {
  if (!Notifications) return;
  const ok = await ensureNotificationPermission().catch(() => false);
  if (!ok) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `lowstock_${medicineId}`,
    content: {
      title: "Low stock",
      body: `${medicineName} is down to ${qty} ${unit} - time to reorder.`,
      data: { medicineId },
      ...(Platform.OS === "android" ? { channelId: "lowstock" } : {}),
    },
    trigger: null,
  });
}

const LOWSTOCK_DAILY_ID = "lowstock_daily";

/**
 * Schedule (or refresh) a daily 9am digest of medicines currently at/below
 * reorder level, using the most recent snapshot seen while the app was open.
 * Repeats every day via the OS scheduler, so it keeps firing even while the
 * app stays closed - content just goes stale until the app is next opened.
 * Pass an empty list to cancel the digest (nothing low anymore).
 */
export async function scheduleDailyLowStockDigest(
  items: { name: string; qty: number; unit: string }[]
): Promise<void> {
  if (!Notifications) return;
  if (items.length === 0) {
    await cancelDailyLowStockDigest();
    return;
  }
  const ok = await ensureNotificationPermission().catch(() => false);
  if (!ok) return;

  const body =
    items.length === 1
      ? `${items[0].name} is down to ${items[0].qty} ${items[0].unit}.`
      : `${items.length} medicines are at or below reorder level: ${items
        .slice(0, 3)
        .map((i) => i.name)
        .join(", ")}${items.length > 3 ? "…" : ""}`;

  await Notifications.scheduleNotificationAsync({
    identifier: LOWSTOCK_DAILY_ID,
    content: {
      title: "Low stock reminder",
      body,
      data: { kind: "lowstock_daily" },
      ...(Platform.OS === "android" ? { channelId: "lowstock" } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 },
  });
}

/** Cancel the daily low-stock digest once nothing is low anymore. */
export async function cancelDailyLowStockDigest(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(LOWSTOCK_DAILY_ID).catch(() => { });
}

const EXPIRY_REMINDER_DAYS = [30, 7, 1];

/** Schedule local reminders for a batch's expiry (30/7/1 days before the 1st of its expiry month). */
export async function scheduleExpiryReminders(
  medicineId: string,
  medicineName: string,
  batch: Batch
): Promise<void> {
  if (!Notifications) return;
  const m = /^(\d{4})-(\d{2})$/.exec(batch.expiry);
  if (!m) return;
  const expiryDate = new Date(Number(m[1]), Number(m[2]) - 1, 1);

  const ok = await ensureNotificationPermission().catch(() => false);
  if (!ok) return;

  for (const daysBefore of EXPIRY_REMINDER_DAYS) {
    const fireAt = new Date(expiryDate);
    fireAt.setDate(fireAt.getDate() - daysBefore);
    fireAt.setHours(9, 0, 0, 0);
    if (fireAt <= new Date()) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `expiry_${medicineId}_${batch.batchNo}_${daysBefore}`,
      content: {
        title: daysBefore === 0 ? "Expires today" : `Expiring in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`,
        body: `${medicineName} (Batch ${batch.batchNo}) - ${batch.qty} units, expiry ${batch.expiry}`,
        data: { medicineId, batchNo: batch.batchNo },
        ...(Platform.OS === "android" ? { channelId: "expiry" } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  }
}

/** Cancel expiry reminders for a batch once it's fully consumed or removed. */
export async function cancelExpiryReminders(medicineId: string, batchNo: string): Promise<void> {
  if (!Notifications) return;
  for (const d of EXPIRY_REMINDER_DAYS) {
    await Notifications.cancelScheduledNotificationAsync(`expiry_${medicineId}_${batchNo}_${d}`).catch(() => { });
  }
}

