import { collection, doc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { Batch, StockDoc, Visit, VisitItem } from "../types/models";
import { db } from "./firebase";
import { ledgerCol, patientDoc, stockDoc } from "./paths";

/** Deduct qty from batches. If targetBatchNo is specified, deducts from that batch first. */
function deductFromBatches(batches: Batch[], qty: number, targetBatchNo?: string): Batch[] {
  let remaining = qty;

  // If a specific batch number is targeted, deduct from it first
  const list = batches.map((b) => {
    if (targetBatchNo && b.batchNo === targetBatchNo && remaining > 0) {
      const take = Math.min(b.qty, remaining);
      remaining -= take;
      return { ...b, qty: b.qty - take };
    }
    return { ...b };
  });

  if (remaining <= 0) {
    return list.filter((b) => b.qty > 0);
  }

  // Fallback to FEFO (first-expiry-first-out) for remaining quantity
  const sorted = [...list].sort((a, b) => (a.expiry || "9999-99").localeCompare(b.expiry || "9999-99"));
  const result: Batch[] = [];
  for (const b of sorted) {
    if (remaining <= 0) {
      result.push(b);
      continue;
    }
    const take = Math.min(b.qty, remaining);
    remaining -= take;
    if (b.qty - take > 0) result.push({ ...b, qty: b.qty - take });
  }
  return result;
}

/**
 * Save a visit/prescription: creates the visit doc, decrements stock (FEFO),
 * updates patient's lastVisitAt, writes a ledger entry - atomically.
 * Allows negative-stock override only when `allowInsufficient` is true.
 */
export async function saveVisit(params: {
  accountId: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  diagnosis: string;
  items: VisitItem[];
  consultationFee: number;
  paymentMode: Visit["paymentMode"];
  byUid: string;
  allowInsufficient?: boolean;
}): Promise<string> {
  const { accountId, clinicId, items } = params;
  const medicinesAmount = items.reduce((s, it) => s + it.qty * it.price, 0);
  const totalAmount = medicinesAmount + params.consultationFee;
  const visitRef = doc(collection(db, "accounts", accountId, "visits"));

  await runTransaction(db, async (tx) => {
    const stockRefs = items.map((it) => stockDoc(accountId, clinicId, it.medicineId));
    const stockSnaps = await Promise.all(stockRefs.map((r) => tx.get(r)));

    // Validate stock first
    if (!params.allowInsufficient) {
      items.forEach((it, i) => {
        const have = stockSnaps[i].exists() ? (stockSnaps[i].data() as StockDoc).qty : 0;
        if (have < it.qty) {
          throw new Error(`INSUFFICIENT_STOCK:${it.medicineName}:${have}`);
        }
      });
    }

    tx.set(visitRef, {
      clinicId,
      patientId: params.patientId,
      patientName: params.patientName,
      date: Timestamp.fromDate(new Date()),
      diagnosis: params.diagnosis.trim(),
      items,
      consultationFee: params.consultationFee,
      medicinesAmount,
      totalAmount,
      paymentMode: params.paymentMode,
      printedAt: null,
      createdBy: params.byUid,
    });

    items.forEach((it, i) => {
      const snap = stockSnaps[i];
      if (snap.exists()) {
        const data = snap.data() as StockDoc;
        tx.update(stockRefs[i], {
          qty: (data.qty || 0) - it.qty,
          batches: deductFromBatches(data.batches || [], it.qty),
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(stockRefs[i], {
          clinicId,
          medicineId: it.medicineId,
          qty: -it.qty,
          batches: [],
          updatedAt: serverTimestamp(),
        });
      }
    });

    if (params.patientId) {
      tx.update(patientDoc(accountId, params.patientId), {
        lastVisitAt: Timestamp.fromDate(new Date()),
      });
    }

    tx.set(doc(ledgerCol(accountId)), {
      type: "sale",
      refId: visitRef.id,
      clinicId,
      summary: `Prescription for ${params.patientName}`,
      medicineDeltas: items.map((it) => ({
        medicineId: it.medicineId,
        medicineName: it.medicineName,
        delta: -it.qty,
      })),
      amount: totalAmount,
      byUid: params.byUid,
      at: serverTimestamp(),
    });
  });

  return visitRef.id;
}

/** Manual stock adjustment (damage, expiry return, count correction). */
export async function adjustStock(params: {
  accountId: string;
  clinicId: string;
  medicineId: string;
  medicineName: string;
  delta: number; // + or -
  reason: string;
  byUid: string;
  targetBatchNo?: string;
}): Promise<void> {
  const { accountId, clinicId, medicineId } = params;
  const ref = stockDoc(accountId, clinicId, medicineId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const data = snap.data() as StockDoc;
      const batches =
        params.delta < 0 ? deductFromBatches(data.batches || [], -params.delta, params.targetBatchNo) : data.batches || [];
      tx.update(ref, {
        qty: (data.qty || 0) + params.delta,
        batches,
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(ref, {
        clinicId,
        medicineId,
        qty: params.delta,
        batches: [],
        updatedAt: serverTimestamp(),
      });
    }

    tx.set(doc(ledgerCol(accountId)), {
      type: "adjustment",
      refId: `${clinicId}_${medicineId}`,
      clinicId,
      summary: `Adjustment: ${params.medicineName} (${params.delta > 0 ? "+" : ""}${params.delta}) - ${params.reason.trim()}`,
      medicineDeltas: [
        { medicineId, medicineName: params.medicineName, delta: params.delta },
      ],
      amount: 0,
      byUid: params.byUid,
      at: serverTimestamp(),
    });
  });
}
