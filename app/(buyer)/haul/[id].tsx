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
import type { Href } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
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
import { fetchHaulById, updateHaul, deleteHaul } from "@/services/haul.service";
import { geocodeAddress } from "@/services/geocode.service";
import { upsertAddress } from "@/services/address.service";
import type { GeocodedAddress } from "@/services/geocode.service";
import type { HaulStatus } from "@/types/haul.types";

const STATUS_LABELS: Record<HaulStatus, string> = {
  pending: "Open",
  matched: "Pro Matched",
  in_transit: "In Transit",
  completed: "Completed",
  cancelled: "Cancelled",
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

function parseOptionalNumber(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function AccordionChevron() {
  const { isExpanded } = React.useContext(AccordionItemContext);
  return (
    <AnimatedIcon isExpanded={isExpanded} rotation={180}>
      <Ionicons name="chevron-down" size={14} color="#737373" />
    </AnimatedIcon>
  );
}

export default function HaulDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: haul, isLoading } = useQuery({
    queryKey: ["haul", id],
    queryFn: () => fetchHaulById(id),
    enabled: !!id,
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pickupGeocode, setPickupGeocode] = useState<GeocodedAddress | null>(null);
  const [dropoffGeocode, setDropoffGeocode] = useState<GeocodedAddress | null>(null);
  const [pickupResolved, setPickupResolved] = useState<string | null>(null);
  const [dropoffResolved, setDropoffResolved] = useState<string | null>(null);

  const editable = haul?.status === "pending";
  const active = haul?.status === "matched" || haul?.status === "in_transit";

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: haul
      ? {
          name: haul.name,
          description: haul.description ?? "",
          pickup_location: haul.pickup_address?.full_address ?? "",
          dropoff_location: haul.dropoff_address?.full_address ?? "",
          notes: haul.notes ?? "",
          make: haul.make ?? "",
          model: haul.model ?? "",
          height: haul.height?.toString() ?? "",
          width: haul.width?.toString() ?? "",
          length: haul.length?.toString() ?? "",
          dimension_unit: haul.dimension_unit ?? "",
          weight: haul.weight?.toString() ?? "",
          weight_unit: haul.weight_unit ?? "",
        }
      : undefined,
    resetOptions: { keepDirtyValues: true },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: Parameters<typeof updateHaul>[1] = {
        name: data.name,
        description: data.description,
        notes: data.notes || null,
        make: data.make || null,
        model: data.model || null,
        height: parseOptionalNumber(data.height),
        width: parseOptionalNumber(data.width),
        length: parseOptionalNumber(data.length),
        dimension_unit: data.dimension_unit || null,
        weight: parseOptionalNumber(data.weight),
        weight_unit: data.weight_unit || null,
      };

      if (data.pickup_location !== (haul!.pickup_address?.full_address ?? "")) {
        let geo = pickupGeocode;
        if (!geo) geo = await geocodeAddress(data.pickup_location.trim());
        if (!geo) throw new Error("Could not confirm pickup address");
        const addressId = await upsertAddress({
          street1: geo.street1 ?? data.pickup_location,
          city: geo.city ?? "",
          state: geo.state ?? "",
          zip: geo.zip ?? "",
          lat: geo.lat,
          lng: geo.lng,
        });
        if (!addressId) throw new Error("Could not save pickup address");
        payload.pickup_address_id = addressId;
      }

      if (data.dropoff_location !== (haul!.dropoff_address?.full_address ?? "")) {
        let geo = dropoffGeocode;
        if (!geo) geo = await geocodeAddress(data.dropoff_location.trim());
        if (!geo) throw new Error("Could not confirm dropoff address");
        const addressId = await upsertAddress({
          street1: geo.street1 ?? data.dropoff_location,
          city: geo.city ?? "",
          state: geo.state ?? "",
          zip: geo.zip ?? "",
          lat: geo.lat,
          lng: geo.lng,
        });
        if (!addressId) throw new Error("Could not save dropoff address");
        payload.dropoff_address_id = addressId;
      }

      return updateHaul(id, payload);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["haul", id], updated);
      queryClient.invalidateQueries({ queryKey: ["hauls"] });
      router.replace("/(buyer)" as Href);
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : "Failed to save changes";
      setError("root", { message: msg });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteHaul(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hauls"] });
      router.replace("/(buyer)" as Href);
    },
    onError: (e) => {
      setError("root", { message: e instanceof Error ? e.message : "Failed to delete haul" });
    },
  });

  if (isLoading || !haul) {
    return <View className="bg-background flex-1" />;
  }

  const Field = ({
    label,
    name,
    required,
  }: {
    label: string;
    name: keyof Pick<FormData, "name">;
    required?: boolean;
  }) => (
    <VStack space="sm">
      <Text className="text-muted-foreground text-xs tracking-widest uppercase">
        {label}
        {required && editable && <Text className="text-destructive"> *</Text>}
      </Text>
      {editable ? (
        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
              <InputField
                className="text-foreground py-3 text-base"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
              />
            </Input>
          )}
        />
      ) : (
        <Text className="text-foreground py-3 text-base">
          {String(haul[name as keyof typeof haul] ?? "—")}
        </Text>
      )}
      {errors[name] && <Text className="text-destructive text-xs">{errors[name]?.message}</Text>}
    </VStack>
  );

  const dimensions = [haul.height, haul.width, haul.length].filter(Boolean);
  const hasDimensions = dimensions.length > 0;

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

              <Field label="Item Name" name="name" required />

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Description{editable && <Text className="text-destructive"> *</Text>}
                </Text>
                {editable ? (
                  <Controller
                    control={control}
                    name="description"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                        <InputField
                          className="text-foreground py-3 text-base"
                          placeholder="Describe the item"
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
                ) : (
                  <Text className="text-foreground py-3 text-base">{haul.description ?? "—"}</Text>
                )}
                {errors.description && (
                  <Text className="text-destructive text-xs">{errors.description.message}</Text>
                )}
              </VStack>

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Pickup Location{editable && <Text className="text-destructive"> *</Text>}
                </Text>
                {editable ? (
                  <Controller
                    control={control}
                    name="pickup_location"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                        <InputField
                          className="text-foreground py-3 text-base"
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
                ) : (
                  <Text className="text-foreground py-3 text-base">
                    {haul.pickup_address?.full_address ?? "—"}
                  </Text>
                )}
                {pickupResolved && (
                  <Text className="text-muted-foreground text-xs">{pickupResolved}</Text>
                )}
                {errors.pickup_location && (
                  <Text className="text-destructive text-xs">{errors.pickup_location.message}</Text>
                )}
              </VStack>

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Dropoff Location{editable && <Text className="text-destructive"> *</Text>}
                </Text>
                {editable ? (
                  <Controller
                    control={control}
                    name="dropoff_location"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                        <InputField
                          className="text-foreground py-3 text-base"
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
                ) : (
                  <Text className="text-foreground py-3 text-base">
                    {haul.dropoff_address?.full_address ?? "—"}
                  </Text>
                )}
                {dropoffResolved && (
                  <Text className="text-muted-foreground text-xs">{dropoffResolved}</Text>
                )}
                {errors.dropoff_location && (
                  <Text className="text-destructive text-xs">
                    {errors.dropoff_location.message}
                  </Text>
                )}
              </VStack>

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Notes
                </Text>
                {editable ? (
                  <Controller
                    control={control}
                    name="notes"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                        <InputField
                          className="text-foreground py-3 text-base"
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
                ) : (
                  <Text className="text-foreground py-3 text-base">{haul.notes ?? "—"}</Text>
                )}
              </VStack>

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
                          {editable ? (
                            <Controller
                              control={control}
                              name="make"
                              render={({ field: { onChange, onBlur, value } }) => (
                                <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                                  <InputField
                                    className="text-foreground py-3 text-base"
                                    placeholder="e.g. IKEA"
                                    placeholderTextColor="#737373"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                  />
                                </Input>
                              )}
                            />
                          ) : (
                            <Text className="text-foreground py-3 text-base">
                              {haul.make ?? "—"}
                            </Text>
                          )}
                        </VStack>
                        <VStack space="sm" className="flex-1">
                          <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                            Model
                          </Text>
                          {editable ? (
                            <Controller
                              control={control}
                              name="model"
                              render={({ field: { onChange, onBlur, value } }) => (
                                <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                                  <InputField
                                    className="text-foreground py-3 text-base"
                                    placeholder="e.g. KALLAX"
                                    placeholderTextColor="#737373"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                  />
                                </Input>
                              )}
                            />
                          ) : (
                            <Text className="text-foreground py-3 text-base">
                              {haul.model ?? "—"}
                            </Text>
                          )}
                        </VStack>
                      </HStack>

                      <VStack space="sm">
                        <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                          Dimensions (H × W × L)
                        </Text>
                        {editable ? (
                          <VStack space="md">
                            <HStack space="sm">
                              <Controller
                                control={control}
                                name="height"
                                render={({ field: { onChange, onBlur, value } }) => (
                                  <Input className="border-border flex-1 rounded-none border-0 border-b px-0 shadow-none">
                                    <InputField
                                      className="text-foreground py-3 text-base"
                                      placeholder="Height"
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
                                  <Input className="border-border flex-1 rounded-none border-0 border-b px-0 shadow-none">
                                    <InputField
                                      className="text-foreground py-3 text-base"
                                      placeholder="Width"
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
                                  <Input className="border-border flex-1 rounded-none border-0 border-b px-0 shadow-none">
                                    <InputField
                                      className="text-foreground py-3 text-base"
                                      placeholder="Length"
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
                            <Controller
                              control={control}
                              name="dimension_unit"
                              render={({ field: { onChange, onBlur, value } }) => (
                                <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                                  <InputField
                                    className="text-foreground py-3 text-base"
                                    placeholder="Unit (e.g. inches, cm)"
                                    placeholderTextColor="#737373"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                  />
                                </Input>
                              )}
                            />
                          </VStack>
                        ) : (
                          <Text className="text-foreground py-3 text-base">
                            {hasDimensions
                              ? `${dimensions.join(" × ")}${haul.dimension_unit ? ` ${haul.dimension_unit}` : ""}`
                              : "—"}
                          </Text>
                        )}
                      </VStack>

                      <HStack space="lg" className="flex-1">
                        <VStack space="sm" className="flex-1">
                          <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                            Weight
                          </Text>
                          {editable ? (
                            <Controller
                              control={control}
                              name="weight"
                              render={({ field: { onChange, onBlur, value } }) => (
                                <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                                  <InputField
                                    className="text-foreground py-3 text-base"
                                    placeholder="0"
                                    placeholderTextColor="#737373"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    keyboardType="decimal-pad"
                                  />
                                </Input>
                              )}
                            />
                          ) : (
                            <Text className="text-foreground py-3 text-base">
                              {haul.weight ?? "—"}
                            </Text>
                          )}
                        </VStack>
                        <VStack space="sm" className="flex-1">
                          <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                            Unit
                          </Text>
                          {editable ? (
                            <Controller
                              control={control}
                              name="weight_unit"
                              render={({ field: { onChange, onBlur, value } }) => (
                                <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                                  <InputField
                                    className="text-foreground py-3 text-base"
                                    placeholder="lbs or kg"
                                    placeholderTextColor="#737373"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                  />
                                </Input>
                              )}
                            />
                          ) : (
                            <Text className="text-foreground py-3 text-base">
                              {haul.weight_unit ?? "—"}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                    </VStack>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </VStack>

            {errors.root && (
              <Text className="text-destructive mb-4 text-sm">{errors.root.message}</Text>
            )}

            {editable && (
              <HStack space="sm">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-destructive flex-1"
                  onPress={() => setShowDeleteDialog(true)}
                  isDisabled={deleteMutation.isPending || mutation.isPending}
                >
                  {deleteMutation.isPending && <ButtonSpinner />}
                  <ButtonText className="text-destructive">Delete</ButtonText>
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onPress={handleSubmit((data) => mutation.mutate(data))}
                  isDisabled={mutation.isPending || !isDirty || deleteMutation.isPending}
                >
                  {mutation.isPending && <ButtonSpinner />}
                  <ButtonText>Save Changes</ButtonText>
                </Button>
              </HStack>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AlertDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} size="sm">
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Text className="text-foreground text-lg font-semibold">Delete Haul</Text>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-muted-foreground text-sm">
              Are you sure you want to delete this haul? This cannot be undone.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              size="sm"
              className="bg-destructive"
              onPress={() => {
                setShowDeleteDialog(false);
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <ButtonSpinner />}
              <ButtonText>Delete</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
