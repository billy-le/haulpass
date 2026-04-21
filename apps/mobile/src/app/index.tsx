import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSessionStore } from "@/stores/session.store";

export default function Index() {
  const router = useRouter();
  const status = useSessionStore((s) => s.status);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/(tabs)");
    } else if (status === "unauthenticated") {
      router.replace("/(auth)/sign-in");
    }
  }, [status]);

  // Show a spinner while initializing
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
