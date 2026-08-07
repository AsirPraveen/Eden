import { limit, orderBy, query, where } from "firebase/firestore";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Badge, EmptyState, IconCircle, ListRow, Text } from "../../../components/base";
import { useCollection } from "../../../hooks/useFirestore";
import { ledgerCol, membersCol } from "../../../services/paths";
import { useCanManage, useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing, tabBarClearance } from "../../../theme/tokens";
import { LedgerEntry, LedgerType, Member } from "../../../types/models";
import { formatDateTime, formatMoney } from "../../../utils/format";

const TYPES: { key: LedgerType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "purchase", label: "Purchases" },
  { key: "sale", label: "Sales" },
  { key: "payment", label: "Payments" },
  { key: "adjustment", label: "Adjustments" },
];

const ICON_FOR: Record<LedgerType, { icon: React.ComponentProps<typeof IconCircle>["name"]; tone: React.ComponentProps<typeof IconCircle>["tone"] }> = {
  purchase: { icon: "cart-outline", tone: "info" },
  sale: { icon: "medical-outline", tone: "accent" },
  payment: { icon: "cash-outline", tone: "warning" },
  adjustment: { icon: "swap-vertical-outline", tone: "neutral" },
};

function moneyOutColor(amount: number, colors: { danger: string; textSecondary: string }) {
  if (amount < 0) return colors.danger;
  return colors.textSecondary;
}

function ActivityAmount({ item }: { item: LedgerEntry }) {
  const { colors } = useTheme();
  const isPurchaseOrPayment = item.type === "purchase" || item.type === "payment";
  const invoiceTotal = item.purchaseTotal;
  const hasCash = item.amount !== 0;

  if (isPurchaseOrPayment && invoiceTotal != null) {
    return (
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text variant="caption" color={colors.textSecondary}>
          Invoice {formatMoney(invoiceTotal)}
        </Text>
        {hasCash ? (
          <Text variant="body" color={moneyOutColor(item.amount, colors)} style={{ fontWeight: "600" }}>
            {formatMoney(item.amount)}
          </Text>
        ) : item.type === "purchase" ? (
          <Text variant="caption" color={colors.textMuted}>
            On credit
          </Text>
        ) : null}
      </View>
    );
  }

  if (!hasCash) return null;

  return (
    <Text
      variant="body"
      color={item.amount > 0 ? colors.accent : moneyOutColor(item.amount, colors)}
      style={{ fontWeight: "500" }}
    >
      {item.amount > 0 ? "+" : ""}
      {formatMoney(item.amount)}
    </Text>
  );
}

export default function Activity() {
  const { colors } = useTheme();
  const { accountId, clinicId, user, member } = useSession();
  const canManage = useCanManage();
  const isStaff = member?.role === "staff";
  const [type, setType] = useState<LedgerType | "all">("all");

  const { data: entries, loading } = useCollection<LedgerEntry>(
    () => {
      if (!accountId || !clinicId) return null;
      const base = ledgerCol(accountId);
      if (canManage) {
        return type === "all"
          ? query(base, where("clinicId", "==", clinicId), orderBy("at", "desc"), limit(200))
          : query(
            base,
            where("clinicId", "==", clinicId),
            where("type", "==", type),
            orderBy("at", "desc"),
            limit(200)
          );
      }
      if (!user) return null;
      return type === "all"
        ? query(
          base,
          where("clinicId", "==", clinicId),
          where("byUid", "==", user.uid),
          orderBy("at", "desc"),
          limit(200)
        )
        : query(
          base,
          where("clinicId", "==", clinicId),
          where("byUid", "==", user.uid),
          where("type", "==", type),
          orderBy("at", "desc"),
          limit(200)
        );
    },
    [accountId, clinicId, type, user?.uid, canManage]
  );

  const { data: members } = useCollection<Member>(
    () => (accountId && canManage ? query(membersCol(accountId)) : null),
    [accountId, canManage]
  );
  const nameByUid = useMemo(() => new Map(members.map((m) => [m.uid, m.name])), [members]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isStaff ? (
        <Text variant="caption" color={colors.textSecondary} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          Showing your activity only
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
          padding: spacing.lg,
          paddingTop: isStaff ? spacing.sm : spacing.lg,
        }}
      >
        {TYPES.map((t) => (
          <Pressable key={t.key} onPress={() => setType(t.key)}>
            <Badge text={t.label} tone={type === t.key ? "accent" : "neutral"} />
          </Pressable>
        ))}
      </View>
      <FlatList
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
        data={entries}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <ListRow
            left={<IconCircle name={ICON_FOR[item.type].icon} tone={ICON_FOR[item.type].tone} size={34} />}
            title={item.summary}
            subtitle={`${item.at ? formatDateTime(item.at.toDate()) : ""}${canManage && nameByUid.get(item.byUid) ? ` · ${nameByUid.get(item.byUid)}` : ""
              }`}
            right={<ActivityAmount item={item} />}
          />
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title="No activity yet"
              message={
                isStaff
                  ? "Actions you take - sales, purchases, payments - will appear here."
                  : "Every stock movement and payment is recorded here, with who did it and when."
              }
            />
          )
        }
      />
    </View>
  );
}
