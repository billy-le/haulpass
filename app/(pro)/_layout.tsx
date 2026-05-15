import { Tabs, Redirect } from "expo-router";
import type { Href } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ProLayout() {
  const session = useAuthStore((s) => s.session);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  if (!session) return <Redirect href={"/(auth)/login" as Href} />;
  if (!isOnboarded) return <Redirect href={"/(onboarding)/profile" as Href} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { borderTopWidth: 1 },
        tabBarLabelStyle: {
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="briefcase.fill" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="chart.bar.fill" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="person.fill" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
    </Tabs>
  );
}
