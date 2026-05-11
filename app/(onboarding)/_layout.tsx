import { Redirect, Stack } from "expo-router";
import type { Href } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";

export default function OnboardingLayout() {
  const session = useAuthStore((s) => s.session);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const role = useAuthStore((s) => s.role);

  if (!session) return <Redirect href="/(auth)/login" />;
  if (isOnboarded) return <Redirect href={(role === "pro" ? "/(pro)" : "/(buyer)") as Href} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
