import { useEffect } from "react";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";

export default function Index() {
  const router = useRouter();
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (!initialized) return;
    if (!session) {
      router.replace("/(auth)/login");
    } else if (!isOnboarded) {
      router.replace("/(onboarding)/profile");
    } else {
      router.replace((role === "pro" ? "/(pro)" : "/(buyer)") as Href);
    }
  }, [initialized, session, isOnboarded, role, router]);

  return null;
}
