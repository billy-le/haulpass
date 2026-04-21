import { useEffect } from "react";
import { Stack } from "expo-router";
import { useSessionStore } from "@/stores/session.store";
import '@/global.css'

export default function RootLayout() {
  const initialize = useSessionStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
