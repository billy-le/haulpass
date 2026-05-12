import React, { useEffect, useRef, useState } from "react";
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
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { geocodeAddress, type GeocodedAddress } from "@/services/geocode.service";
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
import { uploadHaulImages, analyzeImages } from "@/services/haul.service";
import { fetchBuyerAddresses, formatAddress } from "@/services/address.service";
import { useAuthStore } from "@/stores/auth.store";
import { useHaulDraftStore } from "@/stores/haul-draft.store";

function ImageCarousel({ images }: { images: string[] }) {
  const { width } = useWindowDimensions();
  const imageWidth = width - 48;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <VStack space="sm">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / imageWidth);
          setActiveIndex(index);
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
              className={`h-1.5 rounded-full ${
                i === activeIndex ? "bg-foreground w-3" : "bg-border w-1.5"
              }`}
            />
          ))}
        </HStack>
      )}
      <Text className="text-muted-foreground text-xs">
        {images.length} image{images.length !== 1 ? "s" : ""}
      </Text>
    </VStack>
  );
}

const schema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().min(1, "Description is required"),
  pickup_location: z.string().min(1, "Pickup location is required"),
  dropoff_location: z.string().min(1, "Dropoff location is required"),
  notes: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  height: z.string().optional(),
  width: z.string().optional(),
  length: z.string().optional(),
  dimension_unit: z.string().optional(),
  weight: z.string().optional(),
  weight_unit: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function AccordionChevron() {
  const { isExpanded } = React.useContext(AccordionItemContext);
  return (
    <AnimatedIcon isExpanded={isExpanded} rotation={180}>
      <Ionicons name="chevron-down" size={14} color="#737373" />
    </AnimatedIcon>
  );
}

const inputClass = "border-border rounded-none border-0 border-b px-0 shadow-none";
const inputFieldClass = "text-foreground py-3 text-base";

export default function RequestHaulScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const setDraft = useHaulDraftStore((s) => s.setDraft);

  const [localImages, setLocalImages] = useState<string[]>([]);
  const [relevantIndices, setRelevantIndices] = useState<number[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const analyzingRef = useRef(false);
  const [pickupGeocode, setPickupGeocode] = useState<GeocodedAddress | null>(null);
  const [dropoffGeocode, setDropoffGeocode] = useState<GeocodedAddress | null>(null);
  const [pickupResolved, setPickupResolved] = useState<string | null>(null);
  const [dropoffResolved, setDropoffResolved] = useState<string | null>(null);

  const { data: addresses } = useQuery({
    queryKey: ["buyer_addresses", userId],
    queryFn: () => fetchBuyerAddresses(userId!),
    enabled: !!userId,
  });

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      pickup_location: "",
      dropoff_location: "",
      notes: "",
      make: "",
      model: "",
      height: "",
      width: "",
      length: "",
      dimension_unit: "",
      weight: "",
      weight_unit: "",
    },
  });

  useEffect(() => {
    if (addresses && addresses.length > 0) {
      setValue("dropoff_location", formatAddress(addresses[0]));
    }
  }, [addresses, setValue]);

  async function handlePickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    const uris = result.assets.map((a) => a.uri);
    setLocalImages(uris);
    setRelevantIndices([]);
    setAiUsed(false);
  }

  async function handleAnalyze() {
    if (localImages.length === 0 || aiUsed || analyzingRef.current) return;
    analyzingRef.current = true;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const data = await analyzeImages(localImages);
      setRelevantIndices(data.relevant_indices);
      setAiUsed(true);
      if (data.name) setValue("name", data.name, { shouldValidate: true });
      if (data.description) setValue("description", data.description, { shouldValidate: true });
      const hasAccordionData =
        data.make ||
        data.model ||
        data.height != null ||
        data.width != null ||
        data.length != null ||
        data.dimension_unit ||
        data.weight != null ||
        data.weight_unit;
      if (data.make) setValue("make", data.make);
      if (data.model) setValue("model", data.model);
      if (data.height != null) setValue("height", String(data.height));
      if (data.width != null) setValue("width", String(data.width));
      if (data.length != null) setValue("length", String(data.length));
      if (data.dimension_unit) setValue("dimension_unit", data.dimension_unit);
      if (data.weight != null) setValue("weight", String(data.weight));
      if (data.weight_unit) setValue("weight_unit", data.weight_unit);
      if (hasAccordionData) setAccordionValue(["details"]);
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Failed to analyze images");
    } finally {
      analyzingRef.current = false;
      setAnalyzing(false);
    }
  }

  const displayImages =
    relevantIndices.length > 0
      ? relevantIndices.map((i) => localImages[i]).filter(Boolean)
      : localImages;

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      let pickup = pickupGeocode;
      if (!pickup && data.pickup_location.trim()) {
        pickup = await geocodeAddress(data.pickup_location.trim());
      }
      let dropoff = dropoffGeocode;
      if (!dropoff && data.dropoff_location.trim()) {
        dropoff = await geocodeAddress(data.dropoff_location.trim());
      }

      if (!pickup) {
        setError("pickup_location", { message: "Could not confirm pickup address" });
        setSubmitting(false);
        return;
      }
      if (!dropoff) {
        setError("dropoff_location", { message: "Could not confirm dropoff address" });
        setSubmitting(false);
        return;
      }

      let photoUrls: string[] = [];
      if (displayImages.length > 0) {
        photoUrls = await uploadHaulImages(userId!, displayImages);
      }

      setDraft({
        name: data.name,
        description: data.description,
        notes: data.notes ?? "",
        make: data.make ?? "",
        model: data.model ?? "",
        height: data.height ?? "",
        width: data.width ?? "",
        length: data.length ?? "",
        dimension_unit: data.dimension_unit ?? "",
        weight: data.weight ?? "",
        weight_unit: data.weight_unit ?? "",
        photoUrls,
        pickup,
        dropoff,
      });

      router.push("/(buyer)/review" as Href);
    } catch (e) {
      setError("root", {
        message: e instanceof Error ? e.message : "Failed to prepare request",
      });
      setSubmitting(false);
    }
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
                ← Cancel
              </Text>
            </Pressable>

            <Text
              className="text-foreground mb-8 text-[32px] leading-tight font-normal"
              style={{ fontFamily: "Georgia" }}
            >
              Request a Haul
            </Text>

            <VStack space="2xl" className="mb-8">
              {/* Photos */}
              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Photos
                </Text>
                <HStack space="sm" className="items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handlePickImages}
                    disabled={submitting}
                  >
                    <ButtonText>Add Photos</ButtonText>
                  </Button>
                  {localImages.length > 0 && !aiUsed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={handleAnalyze}
                      disabled={analyzing}
                    >
                      {analyzing && <ButtonSpinner />}
                      <ButtonText>{analyzing ? "Analyzing…" : "✦ AI"}</ButtonText>
                    </Button>
                  )}
                </HStack>
                {analyzeError && <Text className="text-destructive text-xs">{analyzeError}</Text>}
                {displayImages.length > 0 && <ImageCarousel images={displayImages} />}
              </VStack>

              {/* Item Name */}
              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Item Name <Text className="text-destructive">*</Text>
                </Text>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className={inputClass}>
                      <InputField
                        className={inputFieldClass}
                        placeholder="e.g. West Elm Dining Table"
                        placeholderTextColor="#737373"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                      />
                    </Input>
                  )}
                />
                {errors.name && (
                  <Text className="text-destructive text-xs">{errors.name.message}</Text>
                )}
              </VStack>

              {/* Description */}
              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Description <Text className="text-destructive">*</Text>
                </Text>
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className={inputClass}>
                      <InputField
                        className={inputFieldClass}
                        placeholder="Describe the item — material, color, condition"
                        placeholderTextColor="#737373"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        multiline
                        numberOfLines={3}
                      />
                    </Input>
                  )}
                />
                {errors.description && (
                  <Text className="text-destructive text-xs">{errors.description.message}</Text>
                )}
              </VStack>

              {/* Pickup Location */}
              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Pickup Location <Text className="text-destructive">*</Text>
                </Text>
                <Controller
                  control={control}
                  name="pickup_location"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className={inputClass}>
                      <InputField
                        className={inputFieldClass}
                        placeholder="Enter address or zip code"
                        placeholderTextColor="#737373"
                        value={value}
                        onChangeText={(v) => {
                          onChange(v);
                          setPickupResolved(null);
                          setPickupGeocode(null);
                        }}
                        onBlur={async () => {
                          onBlur();
                          if (value.trim()) {
                            const result = await geocodeAddress(value.trim());
                            setPickupGeocode(result);
                            setPickupResolved(result?.resolvedAddress ?? null);
                          }
                        }}
                        autoCapitalize="words"
                      />
                    </Input>
                  )}
                />
                {pickupResolved && (
                  <Text className="text-muted-foreground text-xs">{pickupResolved}</Text>
                )}
                {errors.pickup_location && (
                  <Text className="text-destructive text-xs">{errors.pickup_location.message}</Text>
                )}
              </VStack>

              {/* Dropoff Location */}
              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Dropoff Location <Text className="text-destructive">*</Text>
                </Text>
                <Controller
                  control={control}
                  name="dropoff_location"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className={inputClass}>
                      <InputField
                        className={inputFieldClass}
                        placeholder="Your delivery address"
                        placeholderTextColor="#737373"
                        value={value}
                        onChangeText={(v) => {
                          onChange(v);
                          setDropoffResolved(null);
                          setDropoffGeocode(null);
                        }}
                        onBlur={async () => {
                          onBlur();
                          if (value.trim()) {
                            const result = await geocodeAddress(value.trim());
                            setDropoffGeocode(result);
                            setDropoffResolved(result?.resolvedAddress ?? null);
                          }
                        }}
                        autoCapitalize="words"
                      />
                    </Input>
                  )}
                />
                {dropoffResolved && (
                  <Text className="text-muted-foreground text-xs">{dropoffResolved}</Text>
                )}
                {errors.dropoff_location && (
                  <Text className="text-destructive text-xs">
                    {errors.dropoff_location.message}
                  </Text>
                )}
              </VStack>

              {/* Notes */}
              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Notes
                </Text>
                <Controller
                  control={control}
                  name="notes"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className={inputClass}>
                      <InputField
                        className={inputFieldClass}
                        placeholder="Any special instructions or details"
                        placeholderTextColor="#737373"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        multiline
                        numberOfLines={3}
                      />
                    </Input>
                  )}
                />
              </VStack>
            </VStack>

            {/* Additional Details accordion */}
            <Accordion
              type="single"
              isCollapsible
              className="border-border border-t"
              value={accordionValue}
              onValueChange={setAccordionValue}
            >
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
                    <HStack space="lg">
                      <VStack space="sm" className="flex-1">
                        <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                          Make
                        </Text>
                        <Controller
                          control={control}
                          name="make"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input className={inputClass}>
                              <InputField
                                className={inputFieldClass}
                                placeholder="e.g. IKEA"
                                placeholderTextColor="#737373"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                autoCapitalize="words"
                              />
                            </Input>
                          )}
                        />
                      </VStack>
                      <VStack space="sm" className="flex-1">
                        <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                          Model
                        </Text>
                        <Controller
                          control={control}
                          name="model"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input className={inputClass}>
                              <InputField
                                className={inputFieldClass}
                                placeholder="e.g. KALLAX"
                                placeholderTextColor="#737373"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                autoCapitalize="words"
                              />
                            </Input>
                          )}
                        />
                      </VStack>
                    </HStack>

                    <VStack space="sm">
                      <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                        Dimensions (H × W × L)
                      </Text>
                      <HStack space="sm">
                        <Controller
                          control={control}
                          name="height"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input className={`${inputClass} flex-1`}>
                              <InputField
                                className={inputFieldClass}
                                placeholder="H"
                                placeholderTextColor="#737373"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                keyboardType="decimal-pad"
                              />
                            </Input>
                          )}
                        />
                        <Controller
                          control={control}
                          name="width"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input className={`${inputClass} flex-1`}>
                              <InputField
                                className={inputFieldClass}
                                placeholder="W"
                                placeholderTextColor="#737373"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                keyboardType="decimal-pad"
                              />
                            </Input>
                          )}
                        />
                        <Controller
                          control={control}
                          name="length"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input className={`${inputClass} flex-1`}>
                              <InputField
                                className={inputFieldClass}
                                placeholder="L"
                                placeholderTextColor="#737373"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                keyboardType="decimal-pad"
                              />
                            </Input>
                          )}
                        />
                        <Controller
                          control={control}
                          name="dimension_unit"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input className={`${inputClass} flex-1`}>
                              <InputField
                                className={inputFieldClass}
                                placeholder="unit"
                                placeholderTextColor="#737373"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                autoCapitalize="none"
                              />
                            </Input>
                          )}
                        />
                      </HStack>
                    </VStack>

                    <VStack space="sm">
                      <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                        Weight
                      </Text>
                      <HStack space="sm">
                        <Controller
                          control={control}
                          name="weight"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input className={`${inputClass} flex-1`}>
                              <InputField
                                className={inputFieldClass}
                                placeholder="Amount"
                                placeholderTextColor="#737373"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                keyboardType="decimal-pad"
                              />
                            </Input>
                          )}
                        />
                        <Controller
                          control={control}
                          name="weight_unit"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input className={`${inputClass} flex-1`}>
                              <InputField
                                className={inputFieldClass}
                                placeholder="lbs / kg"
                                placeholderTextColor="#737373"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                autoCapitalize="none"
                              />
                            </Input>
                          )}
                        />
                      </HStack>
                    </VStack>
                  </VStack>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {errors.root && (
              <Text className="text-destructive mb-4 text-sm">{errors.root.message}</Text>
            )}

            <Button size="lg" onPress={handleSubmit(onSubmit)} disabled={submitting}>
              {submitting && <ButtonSpinner />}
              <ButtonText>{submitting ? "Preparing…" : "Review & Pay"}</ButtonText>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
