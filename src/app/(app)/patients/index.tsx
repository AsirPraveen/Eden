import React, { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { orderBy, query } from "firebase/firestore";
import { Avatar, Button, EmptyState, Input, ListRow, LoadingState } from "../../../components/base";
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

  const { data: patients, loading } = useCollection<Patient>(
    () =>
      accountId
        ? query(patientsCol(accountId), orderBy("lastVisitAt", "desc"))
        : null,
    [accountId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.phone ?? "").includes(q)
    );
  }, [patients, search]);

  return (
    <PermissionGate anyOf={["patientManagement", "sales"]}>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
        <Input
          placeholder="Search by name or phone"
          value={search}
          onChangeText={setSearch}
          containerStyle={{ marginBottom: 0 }}
        />
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
        data={filtered}
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
          loading ? (
            <LoadingState message="Loading patients…" />
          ) : (
            <EmptyState
              icon="people-outline"
              title={search ? "No matches" : "No patients yet"}
              message={search ? "Try a different name or phone number." : "Patients are added the first time you prescribe, or add one now."}
              actionTitle={search ? undefined : "Add patient"}
              onAction={() => router.push("/(app)/patients/new")}
            />
          )
        }
      />
    </View>
    </PermissionGate>
  );
}
