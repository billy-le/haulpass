import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { fetchBuyerHauls } from "@/services/haul.service";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import type { Haul, HaulStatus } from "@/types/haul.types";

const STATUS_LABELS: Record<HaulStatus, string> = {
  pending: "Pending",
  matched: "Pro Matched",
  in_transit: "In Transit",
  completed: "Completed",
  cancelled: "Cancelled",
};

function HaulCard({ haul }: { haul: Haul }) {
  const active =
    haul.status === "pending" || haul.status === "matched" || haul.status === "in_transit";
  return (
    <HStack space="lg" className="border-border mb-4 border p-4">
      <View className="bg-background border-border h-[60px] w-[60px] items-center justify-center border">
        <Text className="text-muted-foreground text-2xl">📦</Text>
      </View>
      <VStack className="flex-1">
        <Text className="text-foreground mb-1 text-lg" style={{ fontFamily: "Georgia" }}>
          {haul.item_name}
        </Text>
        <Text className="text-muted-foreground text-sm">
          From: {haul.pickup_location} · To: {haul.dropoff_location}
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
  );
}

export default function BuyerDashboard() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const firstName = useAuthStore((s) => s.firstName);

  const { data: hauls, isLoading } = useQuery({
    queryKey: ["hauls", userId],
    queryFn: () => fetchBuyerHauls(userId!),
    enabled: !!userId,
  });

  const activeHauls =
    hauls?.filter((h) => h.status !== "completed" && h.status !== "cancelled") ?? [];

  return (
    <View className="bg-card flex-1">
      <View className="bg-background border-border border-b px-6 pt-14 pb-5">
        <Text className="text-foreground text-[28px] font-normal" style={{ fontFamily: "Georgia" }}>
          Hello, {firstName ?? "there"}.
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        <Text className="text-muted-foreground mb-4 text-xs tracking-widest uppercase">
          Active Hauls
        </Text>

        {isLoading ? null : activeHauls.length > 0 ? (
          activeHauls.map((haul) => <HaulCard key={haul.id} haul={haul} />)
        ) : (
          <VStack className="border-border mb-6 items-center border border-dashed py-16">
            <Text className="text-muted-foreground mb-6 text-[15px]">No active hauls yet.</Text>
            <Pressable
              className="bg-foreground px-7 py-3.5"
              onPress={() => router.push("/(buyer)/request" as Href)}
            >
              <Text className="text-background text-[15px] font-medium">Request a Haul</Text>
            </Pressable>
          </VStack>
        )}

        {hauls &&
          hauls.filter((h) => h.status === "completed" || h.status === "cancelled").length > 0 && (
            <>
              <Text className="text-muted-foreground mt-2 mb-4 text-xs tracking-widest uppercase">
                Past Hauls
              </Text>
              {hauls
                .filter((h) => h.status === "completed" || h.status === "cancelled")
                .map((haul) => (
                  <HaulCard key={haul.id} haul={haul} />
                ))}
            </>
          )}
      </ScrollView>
    </View>
  );
}
