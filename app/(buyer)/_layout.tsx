import { Tabs, Redirect } from "expo-router";
import type { Href } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function BuyerLayout() {
  const session = useAuthStore((s) => s.session);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  if (!session) return <Redirect href={"/(auth)/login" as Href} />;
  if (!isOnboarded) return <Redirect href={"/(onboarding)/profile" as Href} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
        },
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
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="house.fill" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="request"
        options={{
          title: "New Haul",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="plus.circle.fill" color={color} size={size} />
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
      <Tabs.Screen name="haul/[id]" options={{ href: null }} />
      <Tabs.Screen name="review" options={{ href: null }} />
    </Tabs>
  );
}
