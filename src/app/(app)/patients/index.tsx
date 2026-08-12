import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { orderBy, query } from "firebase/firestore";
import { Avatar, Badge, Button, EmptyState, Input, ListRow, LoadingState, Text } from "../../../components/base";
import { ClinicContextBadge } from "../../../components/ClinicContextBadge";
import { PermissionGate } from "../../../components/PermissionGate";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCollection } from "../../../hooks/useFirestore";
import { patientsCol } from "../../../services/paths";
import { useSession } from "../../../stores/useSession";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing, tabBarClearance } from "../../../theme/tokens";
import { Patient } from "../../../types/models";
import { formatDate } from "../../../utils/format";

export default function Patients() {
  const { colors } = useTheme();
  const { accountId } = useSession();
  const perms = usePermissions();
  const [search, setSearch] = useState("");
  const [selectedSex, setSelectedSex] = useState<string>("all");
  const [selectedVisit, setSelectedVisit] = useState<string>("all");
  const [selectedAge, setSelectedAge] = useState<string>("all");
  const [limitCount, setLimitCount] = useState(50);

  const { data: patients, loading } = useCollection<Patient>(
    () =>
      accountId
        ? query(patientsCol(accountId), orderBy("lastVisitAt", "desc"))
        : null,
    [accountId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      // Search query
      if (q && !p.name.toLowerCase().includes(q) && !(p.phone ?? "").includes(q)) {
        return false;
      }

      // #10: Sex filter
      if (selectedSex !== "all" && p.sex !== selectedSex) {
        return false;
      }

      // #10: Visit filter
      if (selectedVisit !== "all") {
        if (selectedVisit === "recent") {
          if (!p.lastVisitAt) return false;
          const diffMs = Date.now() - p.lastVisitAt.toDate().getTime();
          if (diffMs > 30 * 24 * 60 * 60 * 1000) return false;
        } else if (selectedVisit === "none") {
          if (p.lastVisitAt) return false;
        }
      }

      // #10: Age filter
      if (selectedAge !== "all") {
        if (p.age === null) return false;
        if (selectedAge === "0to18" && p.age > 18) return false;
        if (selectedAge === "19to40" && (p.age < 19 || p.age > 40)) return false;
        if (selectedAge === "41to60" && (p.age < 41 || p.age > 60)) return false;
        if (selectedAge === "60plus" && p.age < 60) return false;
      }

      return true;
    });
  }, [patients, search, selectedSex, selectedVisit, selectedAge]);

  const displayedPatients = useMemo(() => {
    return filtered.slice(0, limitCount);
  }, [filtered, limitCount]);

  if (loading) return <LoadingState />;

  return (
    <PermissionGate permission="sales">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
          <ClinicContextBadge />
          
          {/* #11: Show total count */}
          <Text variant="caption" color={colors.textSecondary}>
            {filtered.length}{filtered.length !== patients.length ? ` of ${patients.length}` : ""} patient{patients.length === 1 ? "" : "s"}
          </Text>

          <Input
            placeholder="Search by name or phone"
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setLimitCount(50); // reset page limit on search
            }}
            containerStyle={{ marginBottom: 0 }}
          />

          {/* #10: Filter Horizontal Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
              <Pressable
                onPress={() => {
                  const cycle = ["all", "male", "female", "other"];
                  const nextIdx = (cycle.indexOf(selectedSex) + 1) % cycle.length;
                  setSelectedSex(cycle[nextIdx]);
                  setLimitCount(50);
                }}
              >
                <Badge
                  text={selectedSex === "all" ? "Sex: All" : `Sex: ${selectedSex}`}
                  tone={selectedSex !== "all" ? "info" : "neutral"}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  const cycle = ["all", "recent", "none"];
                  const nextIdx = (cycle.indexOf(selectedVisit) + 1) % cycle.length;
                  setSelectedVisit(cycle[nextIdx]);
                  setLimitCount(50);
                }}
              >
                <Badge
                  text={
                    selectedVisit === "all"
                      ? "Visits: All"
                      : selectedVisit === "recent"
                      ? "Visited < 30 days"
                      : "No visits yet"
                  }
                  tone={selectedVisit !== "all" ? "info" : "neutral"}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  const cycle = ["all", "0to18", "19to40", "41to60", "60plus"];
                  const nextIdx = (cycle.indexOf(selectedAge) + 1) % cycle.length;
                  setSelectedAge(cycle[nextIdx]);
                  setLimitCount(50);
                }}
              >
                <Badge
                  text={
                    selectedAge === "all"
                      ? "Age: All"
                      : selectedAge === "0to18"
                      ? "Age: 0-18"
                      : selectedAge === "19to40"
                      ? "Age: 19-40"
                      : selectedAge === "41to60"
                      ? "Age: 41-60"
                      : "Age: 60+"
                  }
                  tone={selectedAge !== "all" ? "info" : "neutral"}
                />
              </Pressable>
            </View>
          </ScrollView>

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            {perms.sales && (
              <Button title="New prescription" compact onPress={() => router.push("/(app)/patients/prescribe")} style={{ flex: 1 }} />
            )}
            {perms.patientManagement && (
              <Button title="Add patient" compact variant={perms.sales ? "secondary" : "primary"} onPress={() => router.push("/(app)/patients/new")} style={{ flex: 1 }} />
            )}
          </View>
        </View>

        <FlatList
          data={displayedPatients}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: tabBarClearance }}
          renderItem={({ item }) => (
            <ListRow
              title={item.name}
              left={<Avatar name={item.name} />}
              subtitle={[
                item.age ? `${item.age} yrs` : "",
                item.sex ?? "",
                item.phone,
              ]
                .filter(Boolean)
                .join(" · ")}
              rightSub={item.lastVisitAt ? `Last visit ${formatDate(item.lastVisitAt.toDate())}` : "No visits yet"}
              onPress={() => router.push(`/(app)/patients/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No patients found"
              message={
                search || selectedSex !== "all" || selectedVisit !== "all" || selectedAge !== "all"
                  ? "Try clearing filters or changing search."
                  : "Patients are added the first time you prescribe, or register one now."
              }
              actionTitle={search ? undefined : "Add patient"}
              onAction={() => router.push("/(app)/patients/new")}
            />
          }
          onEndReached={() => {
            if (limitCount < filtered.length) {
              setLimitCount((prev) => prev + 50);
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            limitCount < filtered.length ? (
              <View style={{ padding: spacing.md, alignItems: "center" }}>
                <Button title="Load more" compact variant="ghost" onPress={() => setLimitCount((prev) => prev + 50)} />
              </View>
            ) : null
          }
        />
      </View>
    </PermissionGate>
  );
}
