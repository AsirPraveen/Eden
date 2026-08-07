import React, { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { query, where } from "firebase/firestore";
import { Badge, Button, EmptyState, Input, ListRow, LoadingState, Text } from "../../../components/base";
import { PermissionGate } from "../../../components/PermissionGate";
import { useCollection } from "../../../hooks/useFirestore";
import { usePermissions } from "../../../hooks/usePermissions";
import { medicinesCol, stockCol } from "../../../services/paths";
import { useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing, tabBarClearance } from "../../../theme/tokens";
import { Medicine, StockDoc } from "../../../types/models";
import { monthsToExpiry } from "../../../utils/format";

type Filter = "all" | "low" | "expiring";

export default function StockList() {
  const { colors } = useTheme();
  const { accountId, clinicId } = useSession();
  const perms = usePermissions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: medicines, loading } = useCollection<Medicine>(
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

  const stockByMedicine = useMemo(() => new Map(stock.map((s) => [s.medicineId, s])), [stock]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicines
      .map((m) => {
        const s = stockByMedicine.get(m.id);
        const qty = s?.qty ?? 0;
        const soonest = (s?.batches ?? [])
          .filter((b) => b.qty > 0 && b.expiry)
          .map((b) => b.expiry)
          .sort()[0];
        const months = soonest ? monthsToExpiry(soonest) : null;
        return { medicine: m, qty, soonestExpiry: soonest, monthsToExpiry: months };
      })
      .filter((r) => {
        if (q && !r.medicine.name.toLowerCase().includes(q) && !r.medicine.genericName.toLowerCase().includes(q))
          return false;
        if (filter === "low") return r.qty <= (r.medicine.lowStockThreshold ?? 0);
        if (filter === "expiring") return r.monthsToExpiry !== null && r.monthsToExpiry <= 3;
        return true;
      })
      .sort((a, b) => a.medicine.name.localeCompare(b.medicine.name));
  }, [medicines, stockByMedicine, search, filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "low", label: "Low stock" },
    { key: "expiring", label: "Expiring soon" },
  ];

  return (
    <PermissionGate permission="inventory">
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Input
          placeholder="Search medicines"
          value={search}
          onChangeText={setSearch}
          containerStyle={{ marginBottom: spacing.md }}
        />
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
          {filters.map((f) => (
            <Pressable key={f.key} onPress={() => setFilter(f.key)}>
              <Badge text={f.label} tone={filter === f.key ? "accent" : "neutral"} />
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          {perms.addMedicine && (
            <Button title="Add" compact variant="secondary" onPress={() => router.push("/(app)/stock/new-medicine")} />
          )}
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.medicine.id}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
        renderItem={({ item }) => {
          const low = item.qty <= (item.medicine.lowStockThreshold ?? 0);
          const expSoon = item.monthsToExpiry !== null && item.monthsToExpiry <= 3;
          return (
            <ListRow
              title={item.medicine.name}
              subtitle={[item.medicine.genericName, item.medicine.form].filter(Boolean).join(" · ")}
              right={
                <View
                  style={{
                    backgroundColor: low ? colors.dangerSoft : colors.accentSoft,
                    borderRadius: 999,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    variant="caption"
                    style={{ fontWeight: "700", color: low ? colors.danger : colors.accent }}
                  >
                    {item.qty} {item.medicine.unit}
                  </Text>
                </View>
              }
              rightSub={
                expSoon ? <Badge tone="warning" text={`Exp ${item.soonestExpiry}`} /> : undefined
              }
              onPress={() => router.push(`/(app)/stock/medicine/${item.medicine.id}`)}
            />
          );
        }}
        ListEmptyComponent={
          loading ? (
            <LoadingState message="Loading stock…" />
          ) : (
            <EmptyState
              icon="cube-outline"
              title={search || filter !== "all" ? "Nothing matches" : "No medicines yet"}
              message={
                search || filter !== "all"
                  ? "Try a different search or filter."
                  : "Add the medicines you keep in stock. Purchases from reps will update quantities automatically."
              }
              actionTitle={search || filter !== "all" || !perms.addMedicine ? undefined : "Add medicine"}
              onAction={perms.addMedicine ? () => router.push("/(app)/stock/new-medicine") : undefined}
            />
          )
        }
      />
    </View>
    </PermissionGate>
  );
}
