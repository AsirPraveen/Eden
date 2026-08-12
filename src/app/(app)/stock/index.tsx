import React, { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { addDoc, query, serverTimestamp, where } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Card, EmptyState, Input, ListRow, LoadingState, Text } from "../../../components/base";
import { ClinicContextBadge } from "../../../components/ClinicContextBadge";
import { PermissionGate } from "../../../components/PermissionGate";
import { useCollection } from "../../../hooks/useFirestore";
import { usePermissions } from "../../../hooks/usePermissions";
import { medicinesCol, stockCol, visitsCol } from "../../../services/paths";
import { useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { radius, spacing, tabBarClearance } from "../../../theme/tokens";
import { Medicine, StockDoc, Visit } from "../../../types/models";
import { monthsToExpiry } from "../../../utils/format";

type Filter = "all" | "low" | "expiring";

export default function StockList() {
  const { colors } = useTheme();
  const { accountId, clinicId } = useSession();
  const perms = usePermissions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedForm, setSelectedForm] = useState<string>("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all");
  const [sortOption, setSortOption] = useState<"name" | "topSold" | "leastSold">("name");
  const [limitCount, setLimitCount] = useState(50);

  // Copy-from-clinic states
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySearch, setCopySearch] = useState("");
  const [selectedCopyIds, setSelectedCopyIds] = useState<Set<string>>(new Set());
  const [copyBusy, setCopyBusy] = useState(false);

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
  const { data: visits } = useCollection<Visit>(
    () =>
      accountId && clinicId
        ? query(visitsCol(accountId), where("clinicId", "==", clinicId))
        : null,
    [accountId, clinicId]
  );

  // Query all active medicines across the practice (for copy-from-clinic)
  const { data: allMedicines } = useCollection<Medicine>(
    () => (accountId ? query(medicinesCol(accountId), where("active", "==", true)) : null),
    [accountId]
  );

  const stockByMedicine = useMemo(() => new Map(stock.map((s) => [s.medicineId, s])), [stock]);

  // Calculate prescription counts for top/least sold sorting
  const salesCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of visits) {
      for (const it of v.items) {
        map.set(it.medicineId, (map.get(it.medicineId) ?? 0) + it.qty);
      }
    }
    return map;
  }, [visits]);

  // #4: Build copyable medicines list: active medicines in other clinics not present in this clinic by name
  const currentNames = useMemo(() => {
    return new Set(medicines.map((m) => m.name.trim().toLowerCase()));
  }, [medicines]);

  const copyableMedicines = useMemo(() => {
    const map = new Map<string, Medicine>();
    for (const m of allMedicines) {
      if (m.clinicId === clinicId) continue;
      const norm = m.name.trim().toLowerCase();
      if (currentNames.has(norm)) continue;
      if (!map.has(norm)) {
        map.set(norm, m);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allMedicines, clinicId, currentNames]);

  const filteredCopyable = useMemo(() => {
    const q = copySearch.trim().toLowerCase();
    if (!q) return copyableMedicines;
    return copyableMedicines.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.genericName ?? "").toLowerCase().includes(q)
    );
  }, [copyableMedicines, copySearch]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = medicines
      .map((m) => {
        const s = stockByMedicine.get(m.id);
        const qty = s?.qty ?? 0;
        const soonest = (s?.batches ?? [])
          .filter((b) => b.qty > 0 && b.expiry)
          .map((b) => b.expiry)
          .sort()[0];
        const months = soonest ? monthsToExpiry(soonest) : null;
        const sold = salesCount.get(m.id) ?? 0;
        return { medicine: m, qty, soonestExpiry: soonest, monthsToExpiry: months, sold };
      })
      .filter((r) => {
        // Search filter
        if (q && !r.medicine.name.toLowerCase().includes(q) && !r.medicine.genericName.toLowerCase().includes(q))
          return false;

        // Base status filters
        if (filter === "low") {
          if (r.qty > (r.medicine.lowStockThreshold ?? 0)) return false;
        } else if (filter === "expiring") {
          if (r.monthsToExpiry === null || r.monthsToExpiry > 3) return false;
        }

        // Form filter
        if (selectedForm !== "all" && r.medicine.form !== selectedForm) return false;

        // Price range filter
        if (selectedPriceRange !== "all") {
          const price = r.medicine.defaultPrice || 0;
          if (selectedPriceRange === "under10" && price >= 10) return false;
          if (selectedPriceRange === "10to50" && (price < 10 || price > 50)) return false;
          if (selectedPriceRange === "50to100" && (price < 50 || price > 100)) return false;
          if (selectedPriceRange === "over100" && price <= 100) return false;
        }

        return true;
      });

    // Sorting options
    if (sortOption === "topSold") {
      return list.sort((a, b) => b.sold - a.sold || a.medicine.name.localeCompare(b.medicine.name));
    } else if (sortOption === "leastSold") {
      return list.sort((a, b) => a.sold - b.sold || a.medicine.name.localeCompare(b.medicine.name));
    }
    return list.sort((a, b) => a.medicine.name.localeCompare(b.medicine.name));
  }, [medicines, stockByMedicine, salesCount, search, filter, selectedForm, selectedPriceRange, sortOption]);

  const displayedRows = useMemo(() => {
    return rows.slice(0, limitCount);
  }, [rows, limitCount]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All Status" },
    { key: "low", label: "Low stock" },
    { key: "expiring", label: "Expiring soon" },
  ];

  const copySelected = async () => {
    if (!accountId || !clinicId || selectedCopyIds.size === 0) return;
    setCopyBusy(true);
    try {
      const promises = [...selectedCopyIds].map((id) => {
        const source = copyableMedicines.find((m) => m.id === id);
        if (!source) return Promise.resolve();
        return addDoc(medicinesCol(accountId), {
          clinicId,
          name: source.name.trim(),
          genericName: (source.genericName ?? "").trim(),
          form: source.form,
          unit: source.unit,
          defaultPrice: source.defaultPrice,
          lowStockThreshold: source.lowStockThreshold ?? 10,
          active: true,
          createdAt: serverTimestamp(),
        });
      });
      await Promise.all(promises);
      setShowCopyModal(false);
      setSelectedCopyIds(new Set());
      setCopySearch("");
      Alert.alert("Success", `Copied ${selectedCopyIds.size} medicine(s) to this clinic.`);
    } catch (e) {
      Alert.alert("Copy failed", (e as Error).message);
    } finally {
      setCopyBusy(false);
    }
  };

  const toggleCopySelection = (id: string) => {
    setSelectedCopyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllCopy = () => {
    if (selectedCopyIds.size === filteredCopyable.length) {
      setSelectedCopyIds(new Set());
    } else {
      setSelectedCopyIds(new Set(filteredCopyable.map((m) => m.id)));
    }
  };

  if (loading) return <LoadingState />;

  return (
    <PermissionGate permission="inventory">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
          <ClinicContextBadge />
          
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
            <Text variant="caption" color={colors.textSecondary}>
              {rows.length}{rows.length !== medicines.length ? ` of ${medicines.length}` : ""} medicine{medicines.length === 1 ? "" : "s"}
            </Text>
            {perms.addMedicine && copyableMedicines.length > 0 && (
              <Button
                title="Copy from clinic"
                compact
                variant="ghost"
                onPress={() => setShowCopyModal(true)}
              />
            )}
          </View>

          <Input
            placeholder="Search medicines"
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setLimitCount(50); // reset page limit on search
            }}
            containerStyle={{ marginBottom: spacing.md }}
          />

          {/* Filter & Sort Horizontal Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
              {filters.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => {
                    setFilter(f.key);
                    setLimitCount(50);
                  }}
                >
                  <Badge text={f.label} tone={filter === f.key ? "accent" : "neutral"} />
                </Pressable>
              ))}

              <Pressable
                onPress={() => {
                  const cycle = ["all", "tablet", "capsule", "syrup", "softgel", "soap", "drops", "ointment", "powder"];
                  const nextIdx = (cycle.indexOf(selectedForm) + 1) % cycle.length;
                  setSelectedForm(cycle[nextIdx]);
                  setLimitCount(50);
                }}
              >
                <Badge
                  text={selectedForm === "all" ? "Form: All" : `Form: ${selectedForm}`}
                  tone={selectedForm !== "all" ? "info" : "neutral"}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  const cycle = ["all", "under10", "10to50", "50to100", "over100"];
                  const nextIdx = (cycle.indexOf(selectedPriceRange) + 1) % cycle.length;
                  setSelectedPriceRange(cycle[nextIdx]);
                  setLimitCount(50);
                }}
              >
                <Badge
                  text={
                    selectedPriceRange === "all"
                      ? "Price: All"
                      : selectedPriceRange === "under10"
                      ? "Price: < ₹10"
                      : selectedPriceRange === "10to50"
                      ? "Price: ₹10-₹50"
                      : selectedPriceRange === "50to100"
                      ? "Price: ₹50-₹100"
                      : "Price: ₹100+"
                  }
                  tone={selectedPriceRange !== "all" ? "info" : "neutral"}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  const cycle = ["name", "topSold", "leastSold"];
                  const nextIdx = (cycle.indexOf(sortOption) + 1) % cycle.length;
                  setSortOption(cycle[nextIdx] as any);
                  setLimitCount(50);
                }}
              >
                <Badge
                  text={
                    sortOption === "name"
                      ? "Sort: Name"
                      : sortOption === "topSold"
                      ? "Sort: Top Prescribed"
                      : "Sort: Least Prescribed"
                  }
                  tone={sortOption !== "name" ? "warning" : "neutral"}
                />
              </Pressable>
            </View>
          </ScrollView>
        </View>

        <FlatList
          data={displayedRows}
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
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Text style={{ fontWeight: "700" }}>
                      {item.qty} {item.medicine.unit}
                    </Text>
                    {low && <Badge tone="danger" text="Low stock" />}
                    {expSoon && <Badge tone="warning" text="Expiring soon" />}
                    {item.sold > 0 && (
                      <Text variant="caption" color={colors.textMuted}>
                        Prescribed {item.sold} times
                      </Text>
                    )}
                  </View>
                }
                onPress={() => router.push(`/(app)/stock/medicine/${item.medicine.id}`)}
              />
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No medicines found"
              message={
                search || filter !== "all" || selectedForm !== "all" || selectedPriceRange !== "all"
                  ? "Try clearing filters or changing search."
                  : "Start by adding your first medicine."
              }
            />
          }
          onEndReached={() => {
            if (limitCount < rows.length) {
              setLimitCount((prev) => prev + 50);
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            limitCount < rows.length ? (
              <View style={{ padding: spacing.md, alignItems: "center" }}>
                <Button title="Load more" compact variant="ghost" onPress={() => setLimitCount((prev) => prev + 50)} />
              </View>
            ) : null
          }
        />
        {perms.addMedicine && (
          <View style={{ position: "absolute", bottom: spacing.xl, right: spacing.xl, zIndex: 10 }}>
            <Button
              title="Add medicine"
              onPress={() => router.push("/(app)/stock/new-medicine")}
              style={{ borderRadius: radius.full, height: 48 }}
            />
          </View>
        )}

        {/* Copy Medicines Modal */}
        <Modal
          visible={showCopyModal}
          animationType="slide"
          onRequestClose={() => {
            setShowCopyModal(false);
            setSelectedCopyIds(new Set());
            setCopySearch("");
          }}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View>
                <Text variant="subheading">Copy Medicines</Text>
                <Text variant="caption" color={colors.textSecondary}>
                  Select unique medicines from other clinics
                </Text>
              </View>
              <Button
                title="Cancel"
                variant="ghost"
                compact
                onPress={() => {
                  setShowCopyModal(false);
                  setSelectedCopyIds(new Set());
                  setCopySearch("");
                }}
              />
            </View>

            {/* Selection Status & Controls */}
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
              <Input
                placeholder="Search copyable medicines"
                value={copySearch}
                onChangeText={setCopySearch}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginVertical: spacing.sm,
                }}
              >
                <Text variant="caption" color={colors.textSecondary}>
                  {selectedCopyIds.size} of {filteredCopyable.length} selected
                </Text>
                {filteredCopyable.length > 0 && (
                  <Button
                    title={selectedCopyIds.size === filteredCopyable.length ? "Deselect all" : "Select all"}
                    variant="ghost"
                    compact
                    onPress={toggleSelectAllCopy}
                  />
                )}
              </View>
            </View>

            {/* List */}
            <FlatList
              data={filteredCopyable}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = selectedCopyIds.has(item.id);
                return (
                  <ListRow
                    title={item.name}
                    subtitle={[item.genericName, item.form].filter(Boolean).join(" · ")}
                    right={
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                        <Text variant="caption" color={colors.textSecondary}>
                          {item.defaultPrice ? `₹${item.defaultPrice}` : "No price"}
                        </Text>
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={24}
                          color={isSelected ? colors.accent : colors.textMuted}
                        />
                      </View>
                    }
                    onPress={() => toggleCopySelection(item.id)}
                  />
                );
              }}
              ListEmptyComponent={<EmptyState title="No copyable medicines" message="All medicines from other clinics are already in this clinic." />}
            />

            {/* Footer Copy Button */}
            {selectedCopyIds.size > 0 && (
              <View
                style={{
                  padding: spacing.lg,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <Button
                  title={`Copy ${selectedCopyIds.size} medicine${selectedCopyIds.size === 1 ? "" : "s"}`}
                  onPress={copySelected}
                  loading={copyBusy}
                />
              </View>
            )}
          </View>
        </Modal>
      </View>
    </PermissionGate>
  );
}
