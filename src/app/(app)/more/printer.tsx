import React, { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Constants from "expo-constants";
import { updateDoc } from "firebase/firestore";
import { Badge, Button, Card, EmptyState, IconCircle, ListRow, Screen, Text } from "../../../components/base";
import { clinicDoc } from "../../../services/paths";
import {
  BtDevice,
  isBluetoothAvailable,
  listPairedPrinters,
  printTest,
} from "../../../services/printing/printer";
import { useSession } from "../../../stores/useSession";
import { defaultBranding } from "../../../theme/branding";
import { useTheme } from "../../../theme/ThemeProvider";
import { spacing } from "../../../theme/tokens";

const APP_NAME = Constants.expoConfig?.name ?? defaultBranding.appName;

export default function PrinterSetup() {
  const { colors } = useTheme();
  const { accountId, clinicId, clinics } = useSession();
  const clinic = clinics.find((c) => c.id === clinicId);

  const [devices, setDevices] = useState<BtDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [paperWidth, setPaperWidth] = useState<58 | 80>(clinic?.printerConfig?.paperWidth ?? 58);
  const [testing, setTesting] = useState(false);

  const scan = async () => {
    setScanning(true);
    try {
      setDevices(await listPairedPrinters());
    } catch (e) {
      Alert.alert("Could not list printers", (e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const select = async (d: BtDevice) => {
    if (!accountId || !clinicId) return;
    await updateDoc(clinicDoc(accountId, clinicId), {
      printerConfig: { name: d.name, address: d.address, paperWidth },
    });
  };

  const setWidth = async (w: 58 | 80) => {
    setPaperWidth(w);
    if (accountId && clinicId && clinic?.printerConfig) {
      await updateDoc(clinicDoc(accountId, clinicId), {
        printerConfig: { ...clinic.printerConfig, paperWidth: w },
      });
    }
  };

  const test = async () => {
    if (!clinic?.printerConfig?.address) return;
    setTesting(true);
    try {
      await printTest(clinic.printerConfig.address, paperWidth, clinic.name);
    } catch (e) {
      Alert.alert("Test print failed", (e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const remove = () => {
    if (!accountId || !clinicId) return;
    updateDoc(clinicDoc(accountId, clinicId), { printerConfig: null });
  };

  if (!isBluetoothAvailable()) {
    return (
      <Screen>
        <EmptyState
          icon="print-outline"
          title="Bluetooth printing unavailable"
          message={`You are running the app in Expo Go, which cannot access Bluetooth. Install the ${APP_NAME} dev/production build to connect a thermal printer. Until then, prescriptions can be shared as PDF.`}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="caption" style={{ marginBottom: spacing.md }}>
        Printer for {clinic?.name ?? "this clinic"}. Pair the printer in your phone's Bluetooth
        settings first, then pick it here.
      </Text>

      {clinic?.printerConfig ? (
        <Card style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md }}>
            <IconCircle name="print" tone="accent" size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="label">Current printer</Text>
              <Text variant="body" style={{ marginTop: 2, fontWeight: "600" }}>
                {clinic.printerConfig.name}
              </Text>
              <Text variant="caption">{clinic.printerConfig.address}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Button title="Test print" compact onPress={test} loading={testing} />
            <Button title="Remove" compact variant="ghost" onPress={remove} />
          </View>
        </Card>
      ) : null}

      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="label" style={{ marginBottom: spacing.md }}>
          Paper width
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {([58, 80] as const).map((w) => (
            <Pressable key={w} onPress={() => setWidth(w)}>
              <Badge text={`${w} mm`} tone={paperWidth === w ? "accent" : "neutral"} />
            </Pressable>
          ))}
        </View>
      </Card>

      <Button title={scanning ? "Looking..." : "Show paired devices"} onPress={scan} loading={scanning} variant="secondary" />

      {devices.length > 0 && (
        <Card style={{ marginTop: spacing.md, padding: 0 }}>
          <Text variant="label" style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
            Paired devices
          </Text>
          {devices.map((d) => (
            <ListRow
              key={d.address}
              left={<IconCircle name="bluetooth" tone={clinic?.printerConfig?.address === d.address ? "accent" : "neutral"} size={34} />}
              title={d.name}
              subtitle={d.address}
              right={
                clinic?.printerConfig?.address === d.address ? (
                  <Badge tone="accent" text="Selected" />
                ) : undefined
              }
              onPress={() => select(d)}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
