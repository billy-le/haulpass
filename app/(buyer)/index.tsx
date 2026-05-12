import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { fetchBuyerHauls } from "@/services/haul.service";
import { fetchUserProfile } from "@/services/profile.service";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import type { Haul, HaulStatus } from "@/types/haul.types";

const STATUS_LABELS: Record<HaulStatus, string> = {
  pending: "Open",
  matched: "Pro Matched",
  in_transit: "In Transit",
  completed: "Completed",
  cancelled: "Cancelled",
};

function HaulCard({ haul }: { haul: Haul }) {
  const router = useRouter();
  const active = haul.status === "matched" || haul.status === "in_transit";
  return (
    <Pressable onPress={() => router.push(`/(buyer)/haul/${haul.id}` as Href)}>
      <HStack space="lg" className="border-border mb-4 border p-4">
        <View className="bg-background border-border h-[60px] w-[60px] items-center justify-center overflow-hidden border">
          {haul.photo_urls.length > 0 ? (
            <Image
              source={{ uri: haul.photo_urls[0] }}
              style={{ width: 60, height: 60 }}
              resizeMode="cover"
            />
          ) : (
            <Text className="text-muted-foreground text-2xl">📦</Text>
          )}
        </View>
        <VStack className="flex-1">
          <Text className="text-foreground mb-1 text-lg" style={{ fontFamily: "Georgia" }}>
            {haul.name}
          </Text>
          <Text className="text-muted-foreground text-sm" numberOfLines={1}>
            {haul.pickup_address?.full_address ?? "—"} → {haul.dropoff_address?.full_address ?? "—"}
          </Text>
          <View className={`mt-2 self-start px-2 py-0.5 ${active ? "bg-brand" : "bg-muted"}`}>
            <Text
              className={`text-[10px] font-semibold tracking-widest uppercase ${active ? "text-white" : "text-muted-foreground"}`}
            >
              {STATUS_LABELS[haul.status]}
            </Text>
          </View>
        </VStack>
      </HStack>
    </Pressable>
  );
}

export default function BuyerDashboard() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

  const { data: profile } = useQuery({
    queryKey: ["user_profile", userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
  });

  const { data: hauls, isLoading } = useQuery({
    queryKey: ["hauls", userId],
    queryFn: () => fetchBuyerHauls(userId!),
    enabled: !!userId,
  });

  const openHauls = hauls?.filter((h) => h.status === "pending") ?? [];
  const activeHauls =
    hauls?.filter((h) => h.status === "matched" || h.status === "in_transit") ?? [];
  const pastHauls =
    hauls?.filter((h) => h.status === "completed" || h.status === "cancelled") ?? [];

  return (
    <View className="bg-card flex-1">
      <View className="bg-background border-border border-b px-6 pt-14 pb-5">
        <Text className="text-foreground text-[28px] font-normal" style={{ fontFamily: "Georgia" }}>
          Hello, {profile?.first_name ?? "there"}.
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        <Text className="text-muted-foreground mb-4 text-xs tracking-widest uppercase">
          Open Hauls
        </Text>

        {isLoading ? null : openHauls.length > 0 ? (
          openHauls.map((haul) => <HaulCard key={haul.id} haul={haul} />)
        ) : (
          <VStack className="border-border mb-6 items-center border border-dashed py-16">
            <Text className="text-muted-foreground mb-6 text-[15px]">No open hauls yet.</Text>
            <Pressable
              className="bg-foreground px-7 py-3.5"
              onPress={() => router.push("/(buyer)/request" as Href)}
            >
              <Text className="text-background text-[15px] font-medium">Request a Haul</Text>
            </Pressable>
          </VStack>
        )}

        {activeHauls.length > 0 && (
          <>
            <Text className="text-muted-foreground mt-2 mb-4 text-xs tracking-widest uppercase">
              Active Hauls
            </Text>
            {activeHauls.map((haul) => (
              <HaulCard key={haul.id} haul={haul} />
            ))}
          </>
        )}

        {pastHauls.length > 0 && (
          <>
            <Text className="text-muted-foreground mt-2 mb-4 text-xs tracking-widest uppercase">
              Past Hauls
            </Text>
            {pastHauls.map((haul) => (
              <HaulCard key={haul.id} haul={haul} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
