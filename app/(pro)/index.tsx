import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";

import { fetchProDashboard } from "@/services/haul.service";
import { getDrivingDistanceMiles } from "@/services/geocode.service";
import { useAuthStore } from "@/stores/auth.store";
import type { ProHaul } from "@/types/haul.types";

function shortLocation(addr: ProHaul["pickup_address"]): string {
  if (!addr) return "—";
  return `${addr.city}, ${addr.state.toUpperCase()}`;
}

function JobCard({
  haul,
  active = false,
  dimmed = false,
  bidAmountCents,
}: {
  haul: ProHaul;
  active?: boolean;
  dimmed?: boolean;
  bidAmountCents?: number;
}) {
  const router = useRouter();
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
    <Pressable onPress={() => router.push(`/(pro)/jobs/${haul.id}` as Href)}>
      <View
        className={`bg-card border-border mb-4 border p-5 ${active ? "border-l-brand border-l-4" : ""} ${dimmed ? "opacity-50" : ""}`}
      >
        <HStack space="md" className="items-start">
          <View className="border-border bg-muted size-15 items-center justify-center overflow-hidden border">
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
            <HStack className="mb-2 items-start justify-between">
              <Text
                className="text-foreground flex-1 text-[18px] font-normal"
                style={{ fontFamily: "Georgia" }}
              >
                {haul.name}
              </Text>
              {bidAmountCents != null && (
                <Text className="text-foreground ml-3 text-[18px] font-normal">
                  ${(bidAmountCents / 100).toFixed(2)}
                </Text>
              )}
            </HStack>
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

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <Text className="text-muted-foreground border-border mb-5 border-b pb-2 text-[11px] tracking-widest uppercase">
      {title} ({count})
    </Text>
  );
}

export default function ProDashboard() {
  const userId = useAuthStore((s) => s.userId);

  const { data, isLoading } = useQuery({
    queryKey: ["pro_dashboard", userId],
    queryFn: () => fetchProDashboard(userId!),
    enabled: !!userId,
  });

  const activeHauls = data?.activeHauls ?? [];
  const jobOffers = data?.jobOffers ?? [];
  const availableHauls = data?.availableHauls ?? [];
  const outbidQuotes = data?.outbidQuotes ?? [];

  return (
    <View className="bg-card flex-1">
      <View className="bg-background border-border border-b px-6 pt-14 pb-5">
        <Text className="text-foreground text-[28px] font-normal" style={{ fontFamily: "Georgia" }}>
          Pass Pro
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {activeHauls.length > 0 && (
          <VStack className="px-6 pt-8">
            <SectionHeader title="Active Hauls" count={activeHauls.length} />
            {activeHauls.map((haul) => (
              <JobCard key={haul.id} haul={haul} active />
            ))}
          </VStack>
        )}

        {jobOffers.length > 0 && (
          <VStack className="px-6 pt-8">
            <SectionHeader title="Job Offers" count={jobOffers.length} />
            {jobOffers.map((quote) => (
              <JobCard key={quote.id} haul={quote.haul} bidAmountCents={quote.amount_cents} />
            ))}
          </VStack>
        )}

        <VStack className="px-6 pt-8">
          <SectionHeader title="Available Jobs" count={availableHauls.length} />
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

        {outbidQuotes.length > 0 && (
          <VStack className="px-6 pt-8">
            <SectionHeader title="Outbid Jobs" count={outbidQuotes.length} />
            {outbidQuotes.map((quote) => (
              <JobCard
                key={quote.id}
                haul={quote.haul}
                bidAmountCents={quote.amount_cents}
                dimmed
              />
            ))}
          </VStack>
        )}
      </ScrollView>
    </View>
  );
}
