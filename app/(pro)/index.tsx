import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";

import { fetchAvailableHaulsForPro } from "@/services/haul.service";
import { getDrivingDistanceMiles } from "@/services/geocode.service";
import { useAuthStore } from "@/stores/auth.store";
import type { Haul } from "@/types/haul.types";

function shortLocation(addr: Haul["pickup_address"]): string {
  if (!addr) return "—";
  return `${addr.city}, ${addr.state.toUpperCase()}`;
}

function JobCard({ haul, active = false }: { haul: Haul; active?: boolean }) {
  const pickup = haul.pickup_address;
  const dropoff = haul.dropoff_address;
  const canComputeDistance =
    pickup?.lat != null && pickup?.lng != null && dropoff?.lat != null && dropoff?.lng != null;

  const { data: distanceMiles } = useQuery({
    queryKey: ["driving_distance", haul.id],
    queryFn: () =>
      getDrivingDistanceMiles(
        { lat: pickup!.lat!, lng: pickup!.lng! },
        { lat: dropoff!.lat!, lng: dropoff!.lng! },
      ),
    enabled: canComputeDistance,
    staleTime: Infinity,
  });

  return (
    <Pressable>
      <View
        className={`bg-card border-border mb-4 border p-5 ${active ? "border-l-brand border-l-4" : ""}`}
      >
        <HStack space="md" className="items-start">
          <View className="border-border bg-muted h-[60px] w-[60px] items-center justify-center overflow-hidden border">
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
            <Text
              className="text-foreground mb-2 text-[18px] font-normal"
              style={{ fontFamily: "Georgia" }}
            >
              {haul.name}
            </Text>
            <Text className="text-muted-foreground text-xs" numberOfLines={1}>
              {shortLocation(pickup)} → {shortLocation(dropoff)}
            </Text>
            {distanceMiles != null && (
              <Text className="text-muted-foreground mt-1 text-xs">{distanceMiles} mi driving</Text>
            )}
          </VStack>
        </HStack>
      </View>
    </Pressable>
  );
}

export default function ProDashboard() {
  const userId = useAuthStore((s) => s.userId);

  const { data: availableHauls = [], isLoading } = useQuery({
    queryKey: ["available_hauls", userId],
    queryFn: () => fetchAvailableHaulsForPro(userId!),
    enabled: !!userId,
  });

  return (
    <View className="bg-card flex-1">
      <View className="bg-background border-border border-b px-6 pt-14 pb-5">
        <Text className="text-foreground text-[28px] font-normal" style={{ fontFamily: "Georgia" }}>
          PassPro
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <VStack className="px-6 pt-8">
          <Text className="text-muted-foreground border-border mb-5 border-b pb-2 text-[11px] tracking-widest uppercase">
            Available Jobs ({availableHauls.length})
          </Text>

          {isLoading ? null : availableHauls.length > 0 ? (
            availableHauls.map((haul) => <JobCard key={haul.id} haul={haul} />)
          ) : (
            <View className="border-border items-center border border-dashed py-16">
              <Text className="text-muted-foreground text-[15px]">
                No available jobs right now.
              </Text>
            </View>
          )}
        </VStack>
      </ScrollView>
    </View>
  );
}
