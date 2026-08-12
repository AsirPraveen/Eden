import AsyncStorage from "@react-native-async-storage/async-storage";
import { query, where } from "firebase/firestore";
import { useEffect, useRef } from "react";
import {
  cancelExpiryReminders,
  ensureNotificationPermission,
  notifyLowStockSummary,
  scheduleDailyLowStockDigest,
  scheduleExpiryReminders,
} from "../services/notifications";
import { medicinesCol, stockCol } from "../services/paths";
import { useSession } from "../stores/useSession";
import { Medicine, StockDoc } from "../types/models";
import { isExpired } from "../utils/format";
import { useCollection } from "./useFirestore";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Watches the active clinic's stock and fires local notifications for
 * low-stock (single summary, deduped per day) and upcoming batch expiry
 * (scheduled ahead, like due-payment reminders).
 */
export function useNotificationWatcher(): void {
  const { accountId, clinicId } = useSession();

  const { data: medicines } = useCollection<Medicine>(
    () =>
      accountId && clinicId
        ? query(medicinesCol(accountId), where("clinicId", "==", clinicId), where("active", "==", true))
        : null,
    [accountId, clinicId]
  );
  const { data: stock } = useCollection<StockDoc>(
    () => (accountId && clinicId ? query(stockCol(accountId), where("clinicId", "==", clinicId)) : null),
    [accountId, clinicId]
  );

  const scheduledBatchKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (accountId && clinicId) ensureNotificationPermission().catch(() => { });
  }, [accountId, clinicId]);

  useEffect(() => {
    if (!accountId || !clinicId) return;
    const medicineById = new Map(medicines.map((m) => [m.id, m]));

    (async () => {
      const seenBatchKeys = new Set<string>();
      const lowStockItems: { name: string; qty: number; unit: string }[] = [];

      for (const s of stock) {
        const medicine = medicineById.get(s.medicineId);
        if (!medicine) continue;

        // Low stock — collect into list for summary notification + daily digest.
        const threshold = medicine.lowStockThreshold ?? 0;
        if (s.qty <= threshold) {
          lowStockItems.push({ name: medicine.name, qty: s.qty, unit: medicine.unit });
        }

        // Expiry — scheduled ahead, one entry per live batch.
        for (const batch of s.batches || []) {
          if (batch.qty <= 0 || !batch.expiry || isExpired(batch.expiry)) continue;
          const key = `${medicine.id}:${batch.batchNo}`;
          seenBatchKeys.add(key);
          await scheduleExpiryReminders(medicine.id, medicine.name, batch).catch(() => { });
        }
      }

      // #21: Single summary notification instead of one per medicine.
      // Deduped per day so it only fires once.
      if (lowStockItems.length > 0) {
        const dedupeKey = `notif:lowstock_summary:${todayKey()}`;
        const alreadyNotified = await AsyncStorage.getItem(dedupeKey).catch(() => null);
        if (!alreadyNotified) {
          await notifyLowStockSummary(
            lowStockItems.length,
            lowStockItems.map((i) => i.name)
          ).catch(() => { });
          await AsyncStorage.setItem(dedupeKey, "1").catch(() => { });
        }
      }

      // Refresh the daily "still low" digest so it keeps firing (with current
      // data) even on days the app never opens; cancels itself once empty.
      await scheduleDailyLowStockDigest(lowStockItems).catch(() => { });

      // Cancel reminders for batches that disappeared (fully consumed/adjusted away).
      for (const key of scheduledBatchKeysRef.current) {
        if (!seenBatchKeys.has(key)) {
          const [medicineId, batchNo] = key.split(":");
          await cancelExpiryReminders(medicineId, batchNo).catch(() => { });
        }
      }
      scheduledBatchKeysRef.current = seenBatchKeys;
    })();
  }, [accountId, clinicId, medicines, stock]);
}

