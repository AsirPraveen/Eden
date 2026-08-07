import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { limit, orderBy, query, Timestamp, where } from "firebase/firestore";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge, Card, IconCircle, Screen, Text } from "../../components/base";
import { BrandLogo } from "../../components/BrandLogo";
import { ClinicSwitcher } from "../../components/ClinicSwitcher";
import { useCollection } from "../../hooks/useFirestore";
import { medicinesCol, purchasesCol, stockCol, visitsCol } from "../../services/paths";
import { useSession } from "../../stores/useSession";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, shadow, spacing } from "../../theme/tokens";
import { Medicine, Purchase, StockDoc, Visit } from "../../types/models";
import { daysUntil, formatMoney } from "../../utils/format";

import { BarChart } from "../../components/BarChart";
import { usePermissions } from "../../hooks/usePermissions";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
  primary,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const { colors, scheme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}>
      <View
        style={[
          {
            backgroundColor: primary ? colors.cta : colors.surface,
            borderColor: colors.border,
            borderWidth: primary ? 0 : 1,
            borderRadius: radius.lg,
            padding: spacing.lg,
            minHeight: 108,
            justifyContent: "space-between",
          },
          scheme === "light" && (primary ? shadow.raised : shadow.card),
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={primary ? colors.onCta : colors.accent}
        />
        <View>
          <Text
            variant="body"
            style={{ fontWeight: "600", color: primary ? colors.onCta : colors.text }}
          >
            {title}
          </Text>
          <Text
            variant="caption"
            style={{ marginTop: 2, color: primary ? colors.onCta : colors.textSecondary, opacity: primary ? 0.85 : 1 }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function StatTile({
  icon,
  value,
  label,
  tint,
  fg,
  iconColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  label: string;
  tint: string;
  fg: string;
  iconColor?: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: tint, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm }}>
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
        <Ionicons name={icon} size={18} color={iconColor ?? "#F8F6F0"} />
      </View>
      <Text variant="heading" numberOfLines={1} adjustsFontSizeToFit color={fg} style={{ fontWeight: "800" }}>
        {value}
      </Text>
      <Text variant="caption" style={{ fontWeight: "600" }} color={fg}>
        {label}
      </Text>
    </View>
  );
}

export default function Home() {
  const { colors, branding } = useTheme();
  const insets = useSafeAreaInsets();
  const { accountId, clinicId, member, user } = useSession();
  const perms = usePermissions();
  const isStaff = member?.role === "staff";

  const since = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 5, 1);
  }, []);

  const { data: chartVisits } = useCollection<Visit>(
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
  const { data: chartPurchases } = useCollection<Purchase>(
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

  const { data: todaysVisits } = useCollection<Visit>(
    () =>
      accountId && clinicId
        ? query(
          visitsCol(accountId),
          where("clinicId", "==", clinicId),
          where("date", ">=", Timestamp.fromDate(startOfToday())),
          orderBy("date", "desc")
        )
        : null,
    [accountId, clinicId]
  );

  const { data: unpaid } = useCollection<Purchase>(
    () =>
      accountId && clinicId
        ? query(
          purchasesCol(accountId),
          where("clinicId", "==", clinicId),
          where("status", "in", ["unpaid", "partial"]),
          orderBy("dueDate", "asc"),
          limit(50)
        )
        : null,
    [accountId, clinicId]
  );

  const { data: stock } = useCollection<StockDoc>(
    () => (accountId && clinicId ? query(stockCol(accountId), where("clinicId", "==", clinicId)) : null),
    [accountId, clinicId]
  );
  const { data: medicines } = useCollection<Medicine>(
    () =>
      accountId && clinicId
        ? query(medicinesCol(accountId), where("clinicId", "==", clinicId), where("active", "==", true))
        : null,
    [accountId, clinicId]
  );

  const myTodaysVisits = useMemo(() => {
    if (!isStaff || !user) return todaysVisits;
    return todaysVisits.filter((v) => v.createdBy === user.uid);
  }, [todaysVisits, isStaff, user]);

  const todayCollection = useMemo(
    () => myTodaysVisits.reduce((s, v) => s + (v.paymentMode === "unpaid" ? 0 : v.totalAmount), 0),
    [myTodaysVisits]
  );

  const todayPatientsCount = useMemo(() => {
    const visits = myTodaysVisits;
    const registeredIds = visits.map((v) => v.patientId).filter(Boolean);
    const uniqueRegistered = new Set(registeredIds).size;
    const walkIns = visits.filter((v) => !v.patientId).length;
    return uniqueRegistered + walkIns;
  }, [myTodaysVisits]);
  const outstanding = useMemo(
    () => unpaid.reduce((s, p) => s + (p.totalAmount - (p.paidAmount || 0)), 0),
    [unpaid]
  );
  const urgentDues = useMemo(() => unpaid.filter((p) => daysUntil(p.dueDate.toDate()) <= 10), [unpaid]);
  const nextDue = unpaid[0];

  const lowStock = useMemo(() => {
    const thresholdById = new Map(medicines.map((m) => [m.id, m.lowStockThreshold ?? 0]));
    return stock.filter((s) => {
      const t = thresholdById.get(s.medicineId);
      return t !== undefined && s.qty <= t;
    });
  }, [stock, medicines]);

  const chartData = useMemo(() => {
    const months: { [key: string]: { sold: number; purchased: number } } = {};
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const k = monthKey(new Date(d.getFullYear(), d.getMonth() - i, 1));
      months[k] = { sold: 0, purchased: 0 };
    }
    chartVisits.forEach((v) => {
      const k = monthKey(v.date.toDate());
      if (months[k]) months[k].sold += v.medicinesAmount || 0;
    });
    chartPurchases.forEach((p) => {
      const k = monthKey(p.date.toDate());
      if (months[k]) months[k].purchased += p.totalAmount || 0;
    });
    return Object.entries(months).map(([k, val]) => ({
      label: monthLabel(k),
      value: val.sold,
      secondary: val.purchased,
    }));
  }, [chartVisits, chartPurchases]);

  const cleanName = (member?.name ?? "").replace(/^(dr\.\s*|dr\s*)/i, "").trim();
  const firstName = cleanName ? cleanName.split(" ")[0] : "";
  const dateLine = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Screen>
      {/* Greeting banner (acts as the header - native header is hidden on this tab) */}
      <View
        style={{
          marginTop: insets.top,
          marginBottom: spacing.xl,
          backgroundColor: branding.primary,
          borderRadius: radius.lg + 6,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            padding: spacing.lg,
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="rgba(248,246,240,0.7)">
              {dateLine}
            </Text>
            <Text variant="title" color={branding.bannerText} style={{ marginTop: 2 }}>
              {firstName ? `Hello, ${firstName}` : "Hello"}
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <ClinicSwitcher light />
            </View>
          </View>
          <BrandLogo size="sm" />
        </View>
      </View>

      {/* Quick actions */}
      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl }}>
        {perms.sales && (
          <QuickAction
            icon={member?.role === "staff" ? "receipt-outline" : "create-outline"}
            title={member?.role === "staff" ? "Sell Medicine" : "Prescribe"}
            subtitle={member?.role === "staff" ? "Bill patient / OTC sale" : "New patient visit"}
            primary
            onPress={() => router.push("/(app)/patients/prescribe")}
          />
        )}
        {perms.purchase && (
          <QuickAction
            icon="cart-outline"
            title="Purchase"
            subtitle="Stock from a rep"
            primary={!perms.sales}
            onPress={() => router.push("/(app)/dues/new-purchase")}
          />
        )}
      </View>

      {/* Today */}
      <Text variant="label" style={{ marginBottom: spacing.sm }}>
        Today
      </Text>
      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl }}>
        <StatTile
          icon="people"
          value={String(todayPatientsCount)}
          label="Patients"
          tint={colors.infoSoft}
          fg={colors.info}
          iconColor={branding.bannerText}
        />
        <StatTile
          icon="wallet"
          value={formatMoney(todayCollection)}
          label="Collected"
          tint={colors.accentSoft}
          fg={colors.accent}
          iconColor={branding.bannerText}
        />
      </View>

      {/* Medicine sold vs purchase */}
      {perms.reports && (
        <Card style={{ marginBottom: spacing.xl }}>
          <Text variant="label" style={{ marginBottom: spacing.xs }}>
            Medicine sold vs purchase
          </Text>
          <Text variant="caption" style={{ marginBottom: spacing.md }} color={colors.textSecondary}>
            Last 6 months · medicine sales vs stock purchased
          </Text>
          <BarChart
            data={chartData}
            height={160}
            variant="grouped"
            primaryName="Medicine sold"
            secondaryName="Purchase"
            formatValue={formatMoney}
          />
        </Card>
      )}

      {/* Needs attention */}
      {(perms.expenses && unpaid.length > 0) || (perms.inventory && lowStock.length > 0) ? (
        <Text variant="label" style={{ marginBottom: spacing.sm }}>
          Needs attention
        </Text>
      ) : null}

      {perms.expenses && unpaid.length > 0 && (
        <Pressable onPress={() => router.push("/(app)/dues")}>
          <Card style={{ marginBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <IconCircle
              name="card-outline"
              tone={urgentDues.length > 0 ? "warning" : "neutral"}
            />
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: "600" }}>
                {formatMoney(outstanding)} due to reps
              </Text>
              <Text variant="caption" style={{ marginTop: 2 }}>
                {nextDue
                  ? `Next: ${nextDue.supplierName} · ${Math.max(0, daysUntil(nextDue.dueDate.toDate()))} day${daysUntil(nextDue.dueDate.toDate()) === 1 ? "" : "s"} left`
                  : ""}
              </Text>
            </View>
            {urgentDues.length > 0 && <Badge tone="warning" text={`${urgentDues.length} soon`} />}
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Card>
        </Pressable>
      )}

      {perms.inventory && lowStock.length > 0 && (
        <Pressable onPress={() => router.push("/(app)/stock")}>
          <Card style={{ marginBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <IconCircle name="cube-outline" tone="danger" />
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: "600" }}>
                {lowStock.length} medicine{lowStock.length === 1 ? "" : "s"} running low
              </Text>
              <Text variant="caption" style={{ marginTop: 2 }}>
                At or below the reorder level
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Card>
        </Pressable>
      )}

      {unpaid.length === 0 && lowStock.length === 0 && todaysVisits.length === 0 && (
        <Card flat style={{ alignItems: "center", paddingVertical: spacing.xl }}>
          <BrandLogo size="md" />
          <Text variant="secondary" style={{ marginTop: spacing.md, textAlign: "center" }}>
            All quiet. Dues, low stock and today's numbers will appear here.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
