import { Ionicons } from "@expo/vector-icons";
import { orderBy, query, Timestamp, where } from "firebase/firestore";
import React, { useMemo } from "react";
import { Alert, Pressable, View } from "react-native";
import { BarChart } from "../../../components/BarChart";
import { Card, EmptyState, ListRow, Screen, Text } from "../../../components/base";
import { PermissionGate } from "../../../components/PermissionGate";
import { useCollection } from "../../../hooks/useFirestore";
import { medicinesCol, purchasesCol, stockCol, visitsCol } from "../../../services/paths";
import { useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { radius, spacing } from "../../../theme/tokens";
import { Medicine, Purchase, StockDoc, Visit } from "../../../types/models";
import { formatMoney } from "../../../utils/format";

const MONTHS = 6;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
}
function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(monthKey(x));
  }
  return out;
}

function StatCard({
  icon,
  value,
  label,
  tint,
  fg,
  infoTitle,
  infoMessage,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  label: string;
  tint: string;
  fg: string;
  infoTitle?: string;
  infoMessage?: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: tint, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: fg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={18} color="#F5F2E9" />
        </View>
        {infoTitle && infoMessage ? (
          <Pressable
            onPress={() => Alert.alert(infoTitle, infoMessage)}
            hitSlop={8}
            accessibilityLabel={`About ${infoTitle}`}
          >
            <Ionicons name="information-circle-outline" size={20} color={fg} />
          </Pressable>
        ) : null}
      </View>
      <Text variant="heading" numberOfLines={1} adjustsFontSizeToFit color={fg} style={{ fontWeight: "800" }}>
        {value}
      </Text>
      <Text variant="caption" color={fg} style={{ fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

export default function Reports() {
  const { colors } = useTheme();
  const { accountId, clinicId } = useSession();
  const since = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - (MONTHS - 1), 1);
  }, []);

  const { data: visits } = useCollection<Visit>(
    () =>
      accountId && clinicId
        ? query(
          visitsCol(accountId),
          where("clinicId", "==", clinicId),
          where("date", ">=", Timestamp.fromDate(since)),
          orderBy("date", "desc")
        )
        : null,
    [accountId, clinicId, since]
  );
  const { data: purchases } = useCollection<Purchase>(
    () =>
      accountId && clinicId
        ? query(
          purchasesCol(accountId),
          where("clinicId", "==", clinicId),
          where("date", ">=", Timestamp.fromDate(since)),
          orderBy("date", "desc")
        )
        : null,
    [accountId, clinicId, since]
  );
  const { data: stock } = useCollection<StockDoc>(
    () => (accountId && clinicId ? query(stockCol(accountId), where("clinicId", "==", clinicId)) : null),
    [accountId, clinicId]
  );
  const { data: medicines } = useCollection<Medicine>(
    () => (accountId && clinicId ? query(medicinesCol(accountId), where("clinicId", "==", clinicId)) : null),
    [accountId, clinicId]
  );

  const months = useMemo(() => lastMonths(MONTHS), []);

  // Medicines, consultation & stock purchased per month
  const monthly = useMemo(() => {
    const meds = new Map<string, number>(months.map((m) => [m, 0]));
    const consultation = new Map<string, number>(months.map((m) => [m, 0]));
    const spent = new Map<string, number>(months.map((m) => [m, 0]));
    for (const v of visits) {
      const k = monthKey(v.date.toDate());
      if (meds.has(k)) meds.set(k, (meds.get(k) ?? 0) + v.medicinesAmount);
      if (consultation.has(k)) consultation.set(k, (consultation.get(k) ?? 0) + v.consultationFee);
    }
    for (const p of purchases) {
      const k = monthKey(p.date.toDate());
      if (spent.has(k)) spent.set(k, (spent.get(k) ?? 0) + p.totalAmount);
    }
    return months.map((m) => ({
      label: monthLabel(m),
      value: meds.get(m) ?? 0,
      secondary: consultation.get(m) ?? 0,
      tertiary: spent.get(m) ?? 0,
    }));
  }, [months, visits, purchases]);

  // This month summary
  const thisMonth = monthKey(new Date());
  const summary = useMemo(() => {
    const mv = visits.filter((v) => monthKey(v.date.toDate()) === thisMonth);
    const consultation = mv.reduce((s, v) => s + v.consultationFee, 0);
    const meds = mv.reduce((s, v) => s + v.medicinesAmount, 0);
    return { patients: mv.length, consultation, meds, total: consultation + meds };
  }, [visits, thisMonth]);

  // Top medicines by quantity prescribed (period)
  const topMedicines = useMemo(() => {
    const acc = new Map<string, { name: string; qty: number; amount: number }>();
    for (const v of visits) {
      for (const it of v.items) {
        const cur = acc.get(it.medicineId) ?? { name: it.medicineName, qty: 0, amount: 0 };
        cur.qty += it.qty;
        cur.amount += it.qty * it.price;
        acc.set(it.medicineId, cur);
      }
    }
    return [...acc.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [visits]);

  // Stock valuation at cost (weighted by batches)
  const stockValue = useMemo(() => {
    let total = 0;
    for (const s of stock) {
      for (const b of s.batches ?? []) total += b.qty * (b.costPrice || 0);
    }
    return total;
  }, [stock]);

  const medicineCount = useMemo(
    () => medicines.filter((m) => m.active).length,
    [medicines]
  );

  const hasData = visits.length > 0 || purchases.length > 0;

  return (
    <PermissionGate permission="reports">
      <Screen>
        {!hasData ? (
          <EmptyState
            title="No data yet"
            message="Reports fill in as you record purchases and prescriptions."
          />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md }}>
              <StatCard
                icon="trending-up"
                value={formatMoney(summary.total)}
                label={`This month · ${summary.patients} visit${summary.patients === 1 ? "" : "s"}`}
                tint={colors.accentSoft}
                fg={colors.accent}
                infoTitle="This month"
                infoMessage="Total collected from prescriptions this calendar month at this clinic - medicine sales plus consultation fees from all visits."
              />
              <StatCard
                icon="cube"
                value={formatMoney(stockValue)}
                label={`Stock value · ${medicineCount} medicines`}
                tint={colors.infoSoft}
                fg={colors.info}
                infoTitle="Stock value"
                infoMessage="Estimated cost of medicines currently in stock (batch purchase cost × quantity on hand). This is not selling price or retail value."
              />
            </View>

            <Card style={{ marginBottom: spacing.md }}>
              <Text variant="label" style={{ marginBottom: spacing.xs }}>
                Revenue & purchases - last {MONTHS} months
              </Text>
              <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
                Side-by-side · medicines sold, consultation fees & stock purchased
              </Text>
              <BarChart
                data={monthly}
                height={180}
                variant="grouped"
                formatValue={formatMoney}
                primaryName="Medicines"
                secondaryName="Consultation"
                tertiaryName="Stock purchased"
              />
            </Card>

            {topMedicines.length > 0 && (
              <Card style={{ padding: 0 }}>
                <Text variant="label" style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
                  Top medicines - last {MONTHS} months
                </Text>
                {topMedicines.map((m, i) => {
                  const medal = i === 0 ? "#D4A574" : i === 1 ? colors.textMuted : i === 2 ? "#B08D57" : colors.border;
                  return (
                    <ListRow
                      key={i}
                      left={
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: i < 3 ? medal : colors.background,
                          }}
                        >
                          <Text
                            variant="caption"
                            color={i < 3 ? "#F5F2E9" : colors.textSecondary}
                            style={{ fontWeight: "800" }}
                          >
                            {i + 1}
                          </Text>
                        </View>
                      }
                      title={m.name}
                      right={formatMoney(m.amount)}
                      rightSub={`${m.qty} units`}
                    />
                  );
                })}
              </Card>
            )}
          </>
        )}
      </Screen>
    </PermissionGate>
  );
}
