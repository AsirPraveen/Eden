import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTO_WHATSAPP_KEY = "eden.autoWhatsApp";

export async function getAutoWhatsApp(): Promise<boolean> {
  const v = await AsyncStorage.getItem(AUTO_WHATSAPP_KEY);
  return v === "1";
}

export async function setAutoWhatsApp(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(AUTO_WHATSAPP_KEY, enabled ? "1" : "0");
}
