import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { deleteDoc, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, Share, StyleSheet, View } from "react-native";
import { Avatar, Badge, Button, Card, EmptyState, ListRow, Screen, SelectChip, Text } from "../../../components/base";
import { useCollection } from "../../../hooks/useFirestore";
import { inviteDoc, invitesCol, memberDoc, membersCol } from "../../../services/paths";
import { useCanManage, useSession } from "../../../stores/useSession";
import { defaultBranding } from "../../../theme/branding";
import { useTheme } from "../../../theme/ThemeProvider";
import { radius, spacing } from "../../../theme/tokens";
import { Invite, Member, Role } from "../../../types/models";

const APP_NAME = Constants.expoConfig?.name ?? defaultBranding.appName;

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function Staff() {
  const { colors } = useTheme();
  const { accountId, clinics, clinicId, member: me, user } = useSession();
  const canManage = useCanManage();
  const isStaffViewer = me?.role === "staff";

  const { data: members } = useCollection<Member>(
    () => (accountId ? query(membersCol(accountId)) : null),
    [accountId]
  );
  const { data: openInvites } = useCollection<Invite>(
    () =>
      accountId
        ? query(invitesCol(), where("accountId", "==", accountId), where("usedBy", "==", null))
        : null,
    [accountId]
  );

  const [role, setRole] = useState<Role>("staff");
  const [inviteClinicIds, setInviteClinicIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Clinic access edit states
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberClinicIds, setEditMemberClinicIds] = useState<string[]>([]);

  const clinicNameById = new Map(clinics.map((c) => [c.id, c.name]));

  useEffect(() => {
    if (clinicId && inviteClinicIds.length === 0) {
      setInviteClinicIds([clinicId]);
    }
  }, [clinicId, inviteClinicIds.length]);

  const toggleClinic = (id: string) => {
    setInviteClinicIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const clinicLabel = (ids: string[]) => {
    if (!ids || ids.length === 0) return "All clinics";
    return ids.map((id) => clinicNameById.get(id) ?? "Clinic").join(", ");
  };

  const visibleMembers = useMemo(
    () => (isStaffViewer ? members.filter((m) => m.role === "owner" || m.role === "doctor") : members),
    [members, isStaffViewer]
  );

  const createInvite = async () => {
    if (!accountId || !user) return;
    if (inviteClinicIds.length === 0) return Alert.alert("Select at least one clinic");
    setBusy(true);
    try {
      const code = makeCode();
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      await setDoc(inviteDoc(code), {
        accountId,
        accountName: "",
        role,
        clinicIds: inviteClinicIds,
        createdBy: user.uid,
        expiresAt: Timestamp.fromDate(expires),
        usedBy: null,
        createdAt: serverTimestamp(),
      });
      const names = clinicLabel(inviteClinicIds);
      await Share.share({
        message: `You're invited to join ${names} on ${APP_NAME} as ${role}. Install the app, create an account, choose "I have an invite code" and enter: ${code} (valid 7 days)`,
      });
    } catch (e) {
      Alert.alert("Could not create invite", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = (m: Member) => {
    if (!accountId || !canManage || m.uid === me?.uid) return;
    Alert.alert(
      m.active ? "Disable access?" : "Restore access?",
      `${m.name || m.email} will ${m.active ? "no longer" : "again"} be able to use this practice.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => updateDoc(memberDoc(accountId, m.uid), { active: !m.active }) },
      ]
    );
  };

  const removeMember = (m: Member) => {
    if (!accountId || me?.role !== "owner" || m.uid === me?.uid) return;
    Alert.alert(
      "Remove member?",
      `${m.name || m.email} will lose access immediately and be removed from this practice. This can't be undone - invite them again if you change your mind.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteDoc(memberDoc(accountId, m.uid)).catch((e) => Alert.alert("Could not remove", (e as Error).message)),
        },
      ]
    );
  };

  const startEditAccess = (m: Member) => {
    setEditingMember(m);
    setEditMemberClinicIds(m.clinicIds || []);
  };

  return (
    <Screen>
      <Card style={{ padding: 0, marginBottom: spacing.md }}>
        <Text variant="label" style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
          {isStaffViewer ? "Doctors" : "Members"}
        </Text>
        {visibleMembers.map((m) => {
          const canModify = canManage && m.uid !== me?.uid && m.role !== "owner";
          const canRemove = me?.role === "owner" && m.uid !== me?.uid && m.role !== "owner";
          return (
            <ListRow
              key={m.uid}
              left={<Avatar name={m.name || m.email} photoUrl={m.photoUrl} size={40} />}
              title={m.name || m.email}
              subtitle={[m.email, m.clinicIds && m.clinicIds.length > 0 ? clinicLabel(m.clinicIds) : "All clinics"].filter(Boolean).join(" · ")}
              chevron={canModify}
              onPress={canModify ? () => startEditAccess(m) : undefined}
              right={
                isStaffViewer ? (
                  <Badge text={m.role} tone={m.role === "owner" ? "accent" : "neutral"} />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <Pressable onPress={canModify ? () => toggleActive(m) : undefined} hitSlop={6}>
                      <Badge text={m.active ? m.role : "disabled"} tone={m.active ? (m.role === "owner" ? "accent" : "neutral") : "danger"} />
                    </Pressable>
                    {canRemove && (
                      <Pressable onPress={() => removeMember(m)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                )
              }
            />
          );
        })}
        {isStaffViewer && visibleMembers.length === 0 && (
          <EmptyState title="" message="No doctors listed for this practice yet." />
        )}
      </Card>

      {canManage && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text variant="label" style={{ marginBottom: spacing.md }}>
            Invite someone
          </Text>
          <Text variant="caption" style={{ marginBottom: spacing.md }}>
            Doctors can do everything except remove the owner. Staff access is controlled in Staff permissions.
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
            <SelectChip icon="medkit-outline" label="doctor" selected={role === "doctor"} onPress={() => setRole("doctor")} />
            <SelectChip icon="person-outline" label="staff" selected={role === "staff"} onPress={() => setRole("staff")} />
          </View>

          {clinics.length > 0 && (
            <>
              <Text variant="caption" style={{ marginBottom: spacing.sm }}>
                Clinic access
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
                {clinics.map((c) => (
                  <SelectChip
                    key={c.id}
                    icon="medkit-outline"
                    label={c.name}
                    selected={inviteClinicIds.includes(c.id)}
                    onPress={() => toggleClinic(c.id)}
                  />
                ))}
              </View>
              <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.lg, marginTop: -spacing.sm }}>
                Select one or more clinics. Staff will only see data for the clinics you choose.
              </Text>
            </>
          )}

          <Button title="Create & share invite code" onPress={createInvite} loading={busy} />
        </Card>
      )}

      {canManage && openInvites.length > 0 && (
        <Card style={{ padding: 0 }}>
          <Text variant="label" style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
            Open invites
          </Text>
          {openInvites.map((i) => (
            <ListRow
              key={i.id}
              title={i.id}
              subtitle={`${i.role} · ${clinicLabel(i.clinicIds)} · expires ${i.expiresAt.toDate().toLocaleDateString("en-IN")}`}
              right={
                <Pressable
                  onPress={() =>
                    Share.share({ message: `${APP_NAME} invite code: ${i.id} - open the app and choose "I have an invite code".` })
                  }
                >
                  <Text variant="body" color={colors.accent}>
                    Share
                  </Text>
                </Pressable>
              }
            />
          ))}
        </Card>
      )}
      {canManage && members.length <= 1 && openInvites.length === 0 && (
        <EmptyState title="" message="Working with another doctor or an assistant? Invite them with a code." />
      )}

      {/* Member Clinic Access Edit Modal */}
      <Modal
        visible={editingMember !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMember(null)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text variant="subheading" style={{ marginBottom: spacing.sm }}>
              Edit clinic access
            </Text>
            <Text variant="body" style={{ fontWeight: "600", marginBottom: spacing.xs }}>
              {editingMember?.name || editingMember?.email}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
              Role: {editingMember?.role}
            </Text>

            <Text variant="caption" style={{ marginBottom: spacing.sm }}>
              Clinic access
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
              {clinics.map((c) => {
                const selected = editMemberClinicIds.includes(c.id);
                return (
                  <SelectChip
                    key={c.id}
                    icon="medkit-outline"
                    label={c.name}
                    selected={selected}
                    onPress={() => {
                      setEditMemberClinicIds((prev) =>
                        prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                      );
                    }}
                  />
                );
              })}
            </View>
            <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
              Select the clinics this member is allowed to access. (Selecting all clinics grants access to all clinics).
            </Text>

            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <Button title="Cancel" variant="ghost" onPress={() => setEditingMember(null)} style={{ flex: 1 }} />
              <Button
                title="Save"
                onPress={async () => {
                  if (!accountId || !editingMember) return;
                  setBusy(true);
                  try {
                    const finalIds = editMemberClinicIds.length === clinics.length ? [] : editMemberClinicIds;
                    await updateDoc(memberDoc(accountId, editingMember.uid), { clinicIds: finalIds });
                    setEditingMember(null);
                  } catch (e) {
                    Alert.alert("Failed to update access", (e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: spacing.lg,
  },
  modalCard: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
});
