import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTitleText,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnimatedIcon } from "@/components/ui/accordion/AccordionAnimatedIcon";
import { AccordionItemContext } from "@gluestack-ui/core/accordion/creator";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchHaulByIdForPro,
  fetchHaulQuotes,
  submitQuote,
  cancelQuote,
  updateQuote,
} from "@/services/haul.service";
import { getDrivingDistanceMiles } from "@/services/geocode.service";
import { useAuthStore } from "@/stores/auth.store";
import type { HaulStatus, HaulQuoteStatus } from "@/types/haul.types";

const STATUS_LABELS: Record<HaulStatus, string> = {
  pending: "Open",
  matched: "Pro Matched",
  in_transit: "In Transit",
  completed: "Completed",
  cancelled: "Cancelled",
};

const QUOTE_STATUS_LABELS: Record<HaulQuoteStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  outbid: "Outbid",
  expired: "Expired",
};

function ImageCarousel({ images }: { images: string[] }) {
  const { width } = useWindowDimensions();
  const imageWidth = width - 48;
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <VStack space="sm">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / imageWidth));
        }}
      >
        {images.map((uri) => (
          <Image
            key={uri}
            source={{ uri }}
            style={{ width: imageWidth, height: imageWidth * 0.75 }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      {images.length > 1 && (
        <HStack className="justify-center gap-1.5">
          {images.map((uri, i) => (
            <View
              key={uri}
              className={`h-1.5 rounded-full ${i === activeIndex ? "bg-foreground w-3" : "bg-border w-1.5"}`}
            />
          ))}
        </HStack>
      )}
    </VStack>
  );
}

function AccordionChevron() {
  const { isExpanded } = React.useContext(AccordionItemContext);
  return (
    <AnimatedIcon isExpanded={isExpanded} rotation={180}>
      <Ionicons name="chevron-down" size={14} color="#737373" />
    </AnimatedIcon>
  );
}

const MILEAGE_RATE_CENTS_PER_MILE = 150;
const PLATFORM_FEE_PCT = 0.15;

function FeeBreakdown({
  amountStr,
  distanceMiles,
}: {
  amountStr: string;
  distanceMiles: number | null | undefined;
}) {
  const amountCents = Math.round((parseFloat(amountStr) || 0) * 100);
  if (amountCents === 0) return null;

  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PCT);
  const mileageFeeCents =
    distanceMiles != null ? Math.round(distanceMiles * MILEAGE_RATE_CENTS_PER_MILE) : 0;
  const totalCents = amountCents + platformFeeCents + mileageFeeCents;

  return (
    <VStack space="sm" className="border-border border p-4">
      <HStack className="items-center justify-between">
        <Text className="text-muted-foreground text-xs">Your quote</Text>
        <Text className="text-foreground text-xs">${(amountCents / 100).toFixed(2)}</Text>
      </HStack>
      {distanceMiles != null && (
        <HStack className="items-center justify-between">
          <Text className="text-muted-foreground text-xs">
            Mileage ({distanceMiles} mi × $1.50)
          </Text>
          <Text className="text-foreground text-xs">${(mileageFeeCents / 100).toFixed(2)}</Text>
        </HStack>
      )}
      <HStack className="items-center justify-between">
        <Text className="text-muted-foreground text-xs">Platform fee (15%)</Text>
        <Text className="text-foreground text-xs">${(platformFeeCents / 100).toFixed(2)}</Text>
      </HStack>
      <View className="border-border border-t pt-2">
        <HStack className="items-center justify-between">
          <Text className="text-foreground text-xs font-semibold">Buyer total</Text>
          <Text className="text-foreground text-xs font-semibold">
            ${(totalCents / 100).toFixed(2)}
          </Text>
        </HStack>
      </View>
    </VStack>
  );
}

const offerSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Enter a valid amount"),
  note: z.string().optional(),
});

type OfferForm = z.infer<typeof offerSchema>;

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const [isEditing, setIsEditing] = useState(false);

  const { data: haul, isLoading } = useQuery({
    queryKey: ["pro_haul", id],
    queryFn: () => fetchHaulByIdForPro(id),
    enabled: !!id,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["pro_haul_quotes", id],
    queryFn: () => fetchHaulQuotes(id),
    enabled: !!id,
  });

  const existingQuote = quotes[0] ?? null;

  const pickup = haul?.pickup_address;
  const dropoff = haul?.dropoff_address;
  const canComputeDistance =
    pickup?.lat != null && pickup?.lng != null && dropoff?.lat != null && dropoff?.lng != null;

  const { data: distanceMiles } = useQuery({
    queryKey: ["driving_distance", id],
    queryFn: () =>
      getDrivingDistanceMiles(
        { lat: pickup!.lat!, lng: pickup!.lng! },
        { lat: dropoff!.lat!, lng: dropoff!.lng! },
      ),
    enabled: canComputeDistance,
    staleTime: Infinity,
  });

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<OfferForm>({
    resolver: zodResolver(offerSchema),
    defaultValues: { amount: "", note: "" },
  });

  const watchedAmount = useWatch({ control, name: "amount" });

  const quoteMutation = useMutation({
    mutationFn: (data: OfferForm) => {
      const cents = Math.round(parseFloat(data.amount) * 100);
      return submitQuote(id, cents, data.note || undefined, distanceMiles ?? undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pro_haul_quotes", id] });
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : "Failed to submit offer";
      setError("root", { message: msg });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: string; data: OfferForm }) => {
      const cents = Math.round(parseFloat(data.amount) * 100);
      return updateQuote(quoteId, cents, data.note || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pro_haul_quotes", id] });
      setIsEditing(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to update offer";
      setError("root", { message: msg });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (quoteId: string) => cancelQuote(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pro_haul_quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["pro_dashboard", userId] });
      router.back();
    },
  });

  function enterEditMode(quote: NonNullable<typeof existingQuote>) {
    reset({
      amount: (quote.amount_cents / 100).toFixed(2),
      note: quote.note ?? "",
    });
    setIsEditing(true);
  }

  if (isLoading || !haul) {
    return <View className="bg-background flex-1" />;
  }

  const active = haul.status === "matched" || haul.status === "in_transit";
  const dimensions = [haul.height, haul.width, haul.length].filter(Boolean);
  const hasDimensions = dimensions.length > 0;

  function shortLocation(addr: typeof pickup): string {
    if (!addr) return "—";
    return `${addr.city}, ${addr.state.toUpperCase()}`;
  }

  return (
    <View className="bg-background flex-1">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="px-6 pt-14 pb-12">
            <Pressable onPress={() => router.back()} className="mb-6">
              <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                ← Back
              </Text>
            </Pressable>

            <HStack className="mb-8 items-start justify-between">
              <Text
                className="text-foreground flex-1 text-[28px] leading-tight font-normal"
                style={{ fontFamily: "Georgia" }}
              >
                {haul.name}
              </Text>
              <View className={`ml-4 self-start px-2 py-0.5 ${active ? "bg-brand" : "bg-muted"}`}>
                <Text
                  className={`text-[10px] font-semibold tracking-widest uppercase ${active ? "text-white" : "text-muted-foreground"}`}
                >
                  {STATUS_LABELS[haul.status]}
                </Text>
              </View>
            </HStack>

            <VStack space="2xl" className="mb-8">
              {haul.photo_urls.length > 0 && <ImageCarousel images={haul.photo_urls} />}

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Route
                </Text>
                <Text className="text-foreground py-1 text-base">
                  {shortLocation(pickup)} → {shortLocation(dropoff)}
                </Text>
                {distanceMiles != null && (
                  <Text className="text-muted-foreground text-xs">{distanceMiles} mi driving</Text>
                )}
              </VStack>

              {haul.description && (
                <VStack space="sm">
                  <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                    Description
                  </Text>
                  <Text className="text-foreground py-1 text-base">{haul.description}</Text>
                </VStack>
              )}

              {haul.notes && (
                <VStack space="sm">
                  <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                    Notes
                  </Text>
                  <Text className="text-foreground py-1 text-base">{haul.notes}</Text>
                </VStack>
              )}

              <Accordion type="single" isCollapsible className="border-border border-t">
                <AccordionItem value="details">
                  <AccordionHeader>
                    <AccordionTrigger>
                      <AccordionTitleText className="text-muted-foreground text-xs tracking-widest uppercase">
                        Additional Details
                      </AccordionTitleText>
                      <AccordionChevron />
                    </AccordionTrigger>
                  </AccordionHeader>
                  <AccordionContent>
                    <VStack space="2xl" className="pt-2">
                      <HStack space="lg" className="flex-1">
                        <VStack space="sm" className="flex-1">
                          <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                            Make
                          </Text>
                          <Text className="text-foreground py-1 text-base">{haul.make ?? "—"}</Text>
                        </VStack>
                        <VStack space="sm" className="flex-1">
                          <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                            Model
                          </Text>
                          <Text className="text-foreground py-1 text-base">
                            {haul.model ?? "—"}
                          </Text>
                        </VStack>
                      </HStack>

                      <VStack space="sm">
                        <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                          Dimensions (H × W × L)
                        </Text>
                        <Text className="text-foreground py-1 text-base">
                          {hasDimensions
                            ? `${dimensions.join(" × ")}${haul.dimension_unit ? ` ${haul.dimension_unit}` : ""}`
                            : "—"}
                        </Text>
                      </VStack>

                      <HStack space="lg" className="flex-1">
                        <VStack space="sm" className="flex-1">
                          <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                            Weight
                          </Text>
                          <Text className="text-foreground py-1 text-base">
                            {haul.weight != null
                              ? `${haul.weight}${haul.weight_unit ? ` ${haul.weight_unit}` : ""}`
                              : "—"}
                          </Text>
                        </VStack>
                      </HStack>
                    </VStack>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </VStack>

            <View className="border-border border-t pt-6">
              <Text
                className="text-foreground mb-6 text-[18px] font-normal"
                style={{ fontFamily: "Georgia" }}
              >
                Submit an Offer
              </Text>

              {existingQuote ? (
                isEditing ? (
                  <VStack space="lg">
                    <VStack space="sm">
                      <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                        Amount <Text className="text-destructive">*</Text>
                      </Text>
                      <HStack className="items-center">
                        <Text className="text-foreground mr-1 text-base">$</Text>
                        <Controller
                          control={control}
                          name="amount"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input className="border-border flex-1 rounded-none border-0 border-b px-0 shadow-none">
                              <InputField
                                className="text-foreground py-3 text-base"
                                placeholder="0.00"
                                placeholderTextColor="#737373"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                keyboardType="decimal-pad"
                              />
                            </Input>
                          )}
                        />
                      </HStack>
                      {errors.amount && (
                        <Text className="text-destructive text-xs">{errors.amount.message}</Text>
                      )}
                    </VStack>
                    <VStack space="sm">
                      <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                        Note (optional)
                      </Text>
                      <Controller
                        control={control}
                        name="note"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                            <InputField
                              className="text-foreground py-3 text-base"
                              placeholder="Any details about your offer"
                              placeholderTextColor="#737373"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              multiline
                              numberOfLines={2}
                            />
                          </Input>
                        )}
                      />
                    </VStack>
                    <FeeBreakdown amountStr={watchedAmount} distanceMiles={distanceMiles} />

                    {errors.root && (
                      <Text className="text-destructive text-sm">{errors.root.message}</Text>
                    )}
                    <HStack space="md">
                      <Button
                        variant="outline"
                        size="lg"
                        onPress={() => setIsEditing(false)}
                        className="flex-1"
                      >
                        <ButtonText>Back</ButtonText>
                      </Button>
                      <Button
                        size="lg"
                        onPress={handleSubmit((data) =>
                          updateMutation.mutate({ quoteId: existingQuote?.id ?? "", data }),
                        )}
                        isDisabled={updateMutation.isPending}
                        className="flex-1"
                      >
                        {updateMutation.isPending && <ButtonSpinner />}
                        <ButtonText>Save Offer</ButtonText>
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  <VStack space="md">
                    <HStack className="items-center justify-between">
                      <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                        Your Offer
                      </Text>
                      <View className="bg-muted px-2 py-0.5">
                        <Text className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                          {QUOTE_STATUS_LABELS[existingQuote.status]}
                        </Text>
                      </View>
                    </HStack>
                    <Text className="text-foreground text-2xl">
                      ${(existingQuote.amount_cents / 100).toFixed(2)}
                    </Text>
                    {existingQuote.note && (
                      <Text className="text-muted-foreground text-sm">{existingQuote.note}</Text>
                    )}
                    {existingQuote.status === "pending" && (
                      <HStack space="md" className="mt-2">
                        <Button
                          variant="outline"
                          size="lg"
                          onPress={() => enterEditMode(existingQuote)}
                          className="flex-1"
                        >
                          <ButtonText>Edit</ButtonText>
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onPress={() => cancelMutation.mutate(existingQuote.id)}
                          isDisabled={cancelMutation.isPending}
                          className="flex-1"
                        >
                          {cancelMutation.isPending && <ButtonSpinner />}
                          <ButtonText>Cancel Bid</ButtonText>
                        </Button>
                      </HStack>
                    )}
                  </VStack>
                )
              ) : haul.status !== "pending" ? (
                <Text className="text-muted-foreground text-sm">
                  This job is no longer accepting offers.
                </Text>
              ) : (
                <VStack space="lg">
                  <VStack space="sm">
                    <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                      Amount <Text className="text-destructive">*</Text>
                    </Text>
                    <HStack className="items-center">
                      <Text className="text-foreground mr-1 text-base">$</Text>
                      <Controller
                        control={control}
                        name="amount"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <Input className="border-border flex-1 rounded-none border-0 border-b px-0 shadow-none">
                            <InputField
                              className="text-foreground py-3 text-base"
                              placeholder="0.00"
                              placeholderTextColor="#737373"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              keyboardType="decimal-pad"
                            />
                          </Input>
                        )}
                      />
                    </HStack>
                    {errors.amount && (
                      <Text className="text-destructive text-xs">{errors.amount.message}</Text>
                    )}
                  </VStack>

                  <VStack space="sm">
                    <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                      Note (optional)
                    </Text>
                    <Controller
                      control={control}
                      name="note"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                          <InputField
                            className="text-foreground py-3 text-base"
                            placeholder="Any details about your offer"
                            placeholderTextColor="#737373"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            multiline
                            numberOfLines={2}
                          />
                        </Input>
                      )}
                    />
                  </VStack>

                  <FeeBreakdown amountStr={watchedAmount} distanceMiles={distanceMiles} />

                  {errors.root && (
                    <Text className="text-destructive text-sm">{errors.root.message}</Text>
                  )}

                  <Button
                    size="lg"
                    onPress={handleSubmit((data) => quoteMutation.mutate(data))}
                    isDisabled={quoteMutation.isPending}
                  >
                    {quoteMutation.isPending && <ButtonSpinner />}
                    <ButtonText>Submit Offer</ButtonText>
                  </Button>
                </VStack>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
