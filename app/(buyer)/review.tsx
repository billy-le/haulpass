import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { createHaul } from "@/services/haul.service";
import { upsertAddress } from "@/services/address.service";
import { useAuthStore } from "@/stores/auth.store";
import { useHaulDraftStore } from "@/stores/haul-draft.store";

const BASE_FEE = 20;
const MILEAGE_RATE = 1;
const DURATION_RATE = 1;
const AVG_SPEED_MPH = 25;
const SERVICE_FEE_RATE = 0.1;

function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseOptionalNumber(v: string): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

export default function ReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const draft = useHaulDraftStore((s) => s.draft);
  const clearDraft = useHaulDraftStore((s) => s.clear);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      router.replace("/(buyer)/request" as Href);
    }
  }, [draft, router]);

  if (!draft) return null;

  const { pickup, dropoff } = draft;
  const distanceMiles = haversineDistanceMiles(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  const mileageCost = distanceMiles * MILEAGE_RATE;
  const durationHrs = distanceMiles / AVG_SPEED_MPH;
  const durationCost = durationHrs * DURATION_RATE;
  const subtotal = BASE_FEE + mileageCost + durationCost;
  const serviceFee = subtotal * SERVICE_FEE_RATE;
  const total = subtotal + serviceFee;

  async function handleConfirm() {
    if (!userId || !draft) return;
    setSubmitting(true);
    setError(null);
    try {
      const [pickupAddressId, dropoffAddressId] = await Promise.all([
        upsertAddress({
          street1: pickup.street1,
          city: pickup.city,
          state: pickup.state,
          zip: pickup.zip,
          country: pickup.country,
          lat: pickup.lat,
          lng: pickup.lng,
        }),
        upsertAddress({
          street1: dropoff.street1,
          city: dropoff.city,
          state: dropoff.state,
          zip: dropoff.zip,
          country: dropoff.country,
          lat: dropoff.lat,
          lng: dropoff.lng,
        }),
      ]);

      if (!pickupAddressId || !dropoffAddressId) {
        setError("Could not save location data. Please go back and re-enter addresses.");
        setSubmitting(false);
        return;
      }

      await createHaul({
        name: draft.name,
        description: draft.description || undefined,
        notes: draft.notes || undefined,
        photo_urls: draft.photoUrls,
        make: draft.make || undefined,
        model: draft.model || undefined,
        height: parseOptionalNumber(draft.height),
        width: parseOptionalNumber(draft.width),
        length: parseOptionalNumber(draft.length),
        dimension_unit: draft.dimension_unit || undefined,
        weight: parseOptionalNumber(draft.weight),
        weight_unit: draft.weight_unit || undefined,
        pickup_address_id: pickupAddressId,
        dropoff_address_id: dropoffAddressId,
      });

      queryClient.invalidateQueries({ queryKey: ["hauls", userId] });
      clearDraft();
      router.replace("/(buyer)" as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create haul request");
      setSubmitting(false);
    }
  }

  return (
    <View className="bg-background flex-1">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-14 pb-12">
          <Pressable onPress={() => router.back()} className="mb-6">
            <Text className="text-muted-foreground text-xs tracking-widest uppercase">
              ← Adjust Request
            </Text>
          </Pressable>

          <Text
            className="text-foreground mb-8 text-[32px] leading-tight font-normal"
            style={{ fontFamily: "Georgia" }}
          >
            Review & Pay
          </Text>

          {/* Addresses */}
          <View className="border-border mb-8 border p-6">
            <VStack space="lg">
              <VStack space="xs">
                <Text className="text-muted-foreground text-[11px] tracking-widest uppercase">
                  From
                </Text>
                <Text className="text-foreground text-base">
                  {pickup.resolvedAddress ??
                    [pickup.street1, pickup.city, pickup.state, pickup.zip]
                      .filter(Boolean)
                      .join(", ")}
                </Text>
              </VStack>

              <View className="border-border border-t" />

              <VStack space="xs">
                <Text className="text-muted-foreground text-[11px] tracking-widest uppercase">
                  To
                </Text>
                <Text className="text-foreground text-base">
                  {dropoff.resolvedAddress ??
                    [dropoff.street1, dropoff.city, dropoff.state, dropoff.zip]
                      .filter(Boolean)
                      .join(", ")}
                </Text>
              </VStack>

              <View className="border-border border-t" />

              <Text className="text-muted-foreground text-sm">
                {distanceMiles.toFixed(1)} miles
              </Text>
            </VStack>
          </View>

          {/* Cost Summary */}
          <View className="border-border mb-8 border p-6">
            <VStack space="sm">
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground text-sm">Base Delivery Fee</Text>
                <Text className="text-foreground text-sm">${fmt(BASE_FEE)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground text-sm">
                  Mileage ({distanceMiles.toFixed(1)} mi @ ${MILEAGE_RATE}/mi)
                </Text>
                <Text className="text-foreground text-sm">${fmt(mileageCost)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground text-sm">
                  Est. Duration ({(durationHrs * 60).toFixed(0)} min @ ${DURATION_RATE}/hr)
                </Text>
                <Text className="text-foreground text-sm">${fmt(durationCost)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground text-sm">
                  Service Fee ({SERVICE_FEE_RATE * 100}%)
                </Text>
                <Text className="text-foreground text-sm">${fmt(serviceFee)}</Text>
              </View>

              <View className="border-border mt-4 border-t pt-4">
                <View className="flex-row justify-between">
                  <Text className="text-foreground text-lg font-semibold">Total Estimate</Text>
                  <Text className="text-brand text-lg font-semibold">${fmt(total)}</Text>
                </View>
              </View>
            </VStack>
          </View>

          <Text className="text-muted-foreground mb-8 text-sm leading-relaxed">
            Your payment is held in escrow and only released once the Pass Pro completes the
            delivery.
          </Text>

          {error && <Text className="text-destructive mb-4 text-sm">{error}</Text>}

          <Button size="lg" onPress={handleConfirm} isDisabled={submitting}>
            {submitting && <ButtonSpinner />}
            <ButtonText>{submitting ? "Opening…" : "Open Haul Request"}</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
