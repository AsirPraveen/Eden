import {
  arrayUnion,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Batch, Payment, Purchase, PurchaseItem, StockDoc } from "../types/models";
import { db } from "./firebase";
import { ledgerCol, purchaseDoc, stockDoc } from "./paths";

export function computeDueDate(date: Date, creditDays: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + creditDays);
  return d;
}

/**
 * Record a purchase from a supplier: creates the purchase doc, increments
 * per-clinic stock (adding batches), and writes a ledger entry - atomically.
 */
export async function recordPurchase(params: {
  accountId: string;
  clinicId: string;
  supplierId: string;
  supplierName: string;
  invoiceNo: string;
  items: PurchaseItem[];
  creditDays: number;
  date: Date;
  dueDate?: Date;
  paidNow: number;
  byUid: string;
}): Promise<string> {
  const { accountId, clinicId, items } = params;
  const totalAmount = items.reduce((sum, it) => sum + it.qty * it.costPrice, 0);
  const dueDate = params.dueDate ?? computeDueDate(params.date, params.creditDays);
  const purchaseRef = doc(collection(db, "accounts", accountId, "purchases"));

  await runTransaction(db, async (tx) => {
    // Read all stock docs first (transactions require reads before writes)
    const stockRefs = items.map((it) => stockDoc(accountId, clinicId, it.medicineId));
    const stockSnaps = await Promise.all(stockRefs.map((r) => tx.get(r)));

    const paidNow = Math.min(params.paidNow, totalAmount);
    const status = paidNow >= totalAmount ? "paid" : paidNow > 0 ? "partial" : "unpaid";
    const payments: Payment[] =
      paidNow > 0
        ? [{ amount: paidNow, date: Timestamp.fromDate(params.date), mode: "cash", note: "Paid at purchase", byUid: params.byUid }]
        : [];

    tx.set(purchaseRef, {
      clinicId,
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      invoiceNo: params.invoiceNo.trim(),
      items,
      totalAmount,
      creditDays: params.creditDays,
      date: Timestamp.fromDate(params.date),
      dueDate: Timestamp.fromDate(dueDate),
      paidAmount: paidNow,
      payments,
      status,
      createdBy: params.byUid,
      createdAt: serverTimestamp(),
    });

    items.forEach((it, i) => {
      const snap = stockSnaps[i];
      const totalQty = it.qty + (it.freeQty || 0);
      const newBatch: Batch = {
        batchNo: it.batchNo.trim(),
        expiry: it.expiry,
        qty: totalQty,
        costPrice: it.costPrice,
      };
      if (snap.exists()) {
        const data = snap.data() as StockDoc;
        tx.update(stockRefs[i], {
          qty: (data.qty || 0) + totalQty,
          batches: [...(data.batches || []), newBatch],
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(stockRefs[i], {
          clinicId,
          medicineId: it.medicineId,
          qty: totalQty,
          batches: [newBatch],
          updatedAt: serverTimestamp(),
        });
      }
    });

    tx.set(doc(ledgerCol(accountId)), {
      type: "purchase",
      refId: purchaseRef.id,
      clinicId,
      summary: `Purchase from ${params.supplierName}${params.invoiceNo.trim() ? ` · Inv ${params.invoiceNo.trim()}` : ""}`,
      medicineDeltas: items.map((it) => ({
        medicineId: it.medicineId,
        medicineName: it.medicineName,
        delta: it.qty + (it.freeQty || 0),
      })),
      purchaseTotal: totalAmount,
      amount: paidNow > 0 ? -paidNow : 0,
      byUid: params.byUid,
      at: serverTimestamp(),
    });
  });

  return purchaseRef.id;
}

/** Record a (possibly partial) payment against a purchase. */
export async function recordPayment(params: {
  accountId: string;
  purchase: Purchase;
  amount: number;
  mode: Payment["mode"];
  note: string;
  byUid: string;
}): Promise<void> {
  const { accountId, purchase } = params;
  const ref = purchaseDoc(accountId, purchase.id);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Purchase not found.");
    const current = snap.data() as Purchase;
    const newPaid = (current.paidAmount || 0) + params.amount;
    if (params.amount <= 0) throw new Error("Enter a valid amount.");
    if (newPaid > current.totalAmount + 0.01) throw new Error("Payment exceeds the amount due.");

    tx.update(ref, {
      paidAmount: newPaid,
      status: newPaid >= current.totalAmount - 0.01 ? "paid" : "partial",
      payments: arrayUnion({
        amount: params.amount,
        date: Timestamp.fromDate(new Date()),
        mode: params.mode,
        note: params.note.trim(),
        byUid: params.byUid,
      }),
    });

    tx.set(doc(ledgerCol(accountId)), {
      type: "payment",
      refId: purchase.id,
      clinicId: current.clinicId,
      summary: `Payment to ${current.supplierName}${current.invoiceNo ? ` · Inv ${current.invoiceNo}` : ""}`,
      medicineDeltas: [],
      purchaseTotal: current.totalAmount,
      amount: -params.amount,
      byUid: params.byUid,
      at: serverTimestamp(),
    });
  });
}
