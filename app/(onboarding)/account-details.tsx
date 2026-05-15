import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { geocodeAddress } from "@/services/geocode.service";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Location from "expo-location";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { updateUserMetadata } from "@/services/auth.service";
import { upsertBuyerAddress } from "@/services/address.service";
import { upsertPassPro } from "@/services/profile.service";
import { useAuthStore } from "@/stores/auth.store";
import type { ServiceLocationType } from "@/types/auth.types";

// ─── Buyer ────────────────────────────────────────────────────────

const buyerSchema = z.object({
  street1: z.string().min(1, "Street address is required"),
  street2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "ZIP code is required"),
  country: z.string().min(1),
});
type BuyerFormData = z.infer<typeof buyerSchema>;

function BuyerForm() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [addressResolved, setAddressResolved] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BuyerFormData>({
    resolver: zodResolver(buyerSchema),
    defaultValues: { street1: "", street2: "", city: "", state: "", zip: "", country: "US" },
  });

  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("root", { message: "Location permission denied" });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      const street1 = [place?.streetNumber, place?.street].filter(Boolean).join(" ");
      setValue("street1", street1, { shouldValidate: true });
      setValue("city", place?.city ?? "", { shouldValidate: true });
      setValue("state", place?.region ?? "", { shouldValidate: true });
      setValue("zip", place?.postalCode ?? "", { shouldValidate: true });
      setValue("country", place?.isoCountryCode ?? "US");
      setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setError("root", { message: "Unable to retrieve location" });
    } finally {
      setLocating(false);
    }
  }

  const onSubmit = async (data: BuyerFormData) => {
    if (!userId) {
      setError("root", { message: "Not authenticated" });
      return;
    }
    try {
      let coords = gpsCoords;
      if (!coords) {
        const result = await geocodeAddress(
          `${data.street1}, ${data.city}, ${data.state} ${data.zip}`,
        );
        if (result) coords = { lat: result.lat, lng: result.lng };
      }
      await upsertBuyerAddress(userId, {
        street1: data.street1,
        street2: data.street2 || undefined,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      await updateUserMetadata({ onboarding_complete: true });
      setOnboarded(true);
      router.replace("/(buyer)" as Href);
    } catch (e) {
      setError("root", { message: e instanceof Error ? e.message : "Failed to save" });
    }
  };

  return (
    <VStack space="2xl">
      <VStack space="sm">
        <Text className="text-muted-foreground text-xs tracking-widest uppercase">
          Street Address
        </Text>
        <Controller
          control={control}
          name="street1"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
              <InputField
                className="text-foreground py-3 text-base"
                placeholder="123 Main St"
                placeholderTextColor="#737373"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoComplete="street-address"
                autoCapitalize="words"
              />
            </Input>
          )}
        />
        {errors.street1 && (
          <Text className="text-destructive text-xs">{errors.street1.message}</Text>
        )}
      </VStack>

      <VStack space="sm">
        <Text className="text-muted-foreground text-xs tracking-widest uppercase">
          Apt, Suite, Unit <Text className="normal-case">(Optional)</Text>
        </Text>
        <Controller
          control={control}
          name="street2"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
              <InputField
                className="text-foreground py-3 text-base"
                placeholder="Apt 4B"
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

      <HStack space="lg">
        <VStack space="sm" className="flex-1">
          <Text className="text-muted-foreground text-xs tracking-widest uppercase">City</Text>
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                <InputField
                  className="text-foreground py-3 text-base"
                  placeholder="Sacramento"
                  placeholderTextColor="#737373"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                />
              </Input>
            )}
          />
          {errors.city && <Text className="text-destructive text-xs">{errors.city.message}</Text>}
        </VStack>

        <VStack space="sm" className="w-20">
          <Text className="text-muted-foreground text-xs tracking-widest uppercase">State</Text>
          <Controller
            control={control}
            name="state"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                <InputField
                  className="text-foreground py-3 text-base"
                  placeholder="CA"
                  placeholderTextColor="#737373"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </Input>
            )}
          />
          {errors.state && <Text className="text-destructive text-xs">{errors.state.message}</Text>}
        </VStack>
      </HStack>

      <VStack space="sm">
        <Text className="text-muted-foreground text-xs tracking-widest uppercase">ZIP Code</Text>
        <Controller
          control={control}
          name="zip"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
              <InputField
                className="text-foreground py-3 text-base"
                placeholder="95814"
                placeholderTextColor="#737373"
                value={value}
                onChangeText={(v) => {
                  onChange(v);
                  setAddressResolved(null);
                }}
                onBlur={async () => {
                  onBlur();
                  const { street1, city, state } = getValues();
                  if (street1 && city && state && value.trim()) {
                    const result = await geocodeAddress(
                      `${street1}, ${city}, ${state} ${value.trim()}`,
                    );
                    if (result) {
                      setGpsCoords({ lat: result.lat, lng: result.lng });
                      setAddressResolved(result.resolvedAddress ?? null);
                    }
                  }
                }}
                keyboardType="numeric"
                maxLength={10}
              />
            </Input>
          )}
        />
        {addressResolved && (
          <Text className="text-muted-foreground text-xs">{addressResolved}</Text>
        )}
        {errors.zip && <Text className="text-destructive text-xs">{errors.zip.message}</Text>}
      </VStack>

      <Button variant="outline" size="lg" onPress={handleUseCurrentLocation} disabled={locating}>
        {locating && <ButtonSpinner />}
        <ButtonText>{locating ? "Locating…" : "Use Current Location"}</ButtonText>
      </Button>

      {errors.root && <Text className="text-destructive text-sm">{errors.root.message}</Text>}

      <Button size="lg" onPress={handleSubmit(onSubmit)} disabled={isSubmitting || locating}>
        {isSubmitting && <ButtonSpinner />}
        <ButtonText>Continue to Dashboard</ButtonText>
      </Button>

      <Text className="text-muted-foreground text-center text-sm">
        You can change this anytime in settings.
      </Text>
    </VStack>
  );
}

// ─── Pro ──────────────────────────────────────────────────────────

const proSchema = z.object({
  companyName: z.string().optional(),
  vehicleMake: z.string().min(1, "Required"),
  vehicleModel: z.string().min(1, "Required"),
  driversLicense: z.string().min(1, "Required"),
  serviceAreas: z
    .array(
      z.object({
        location_type: z.enum(["city", "postal_code"]),
        value: z.string(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        radius_km: z.number().default(25),
      }),
    )
    .min(1, "Add at least one service area"),
});
type ProFormData = z.infer<typeof proSchema>;

function ProForm() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const [locationInput, setLocationInput] = useState("");
  const [stateInput, setStateInput] = useState("");
  const [locationType, setLocationType] = useState<ServiceLocationType>("city");

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProFormData>({
    resolver: zodResolver(proSchema),
    defaultValues: {
      companyName: "",
      vehicleMake: "",
      vehicleModel: "",
      driversLicense: "",
      serviceAreas: [],
    },
  });

  const {
    fields: serviceAreas,
    append: appendServiceArea,
    remove: removeServiceArea,
  } = useFieldArray({ control, name: "serviceAreas" });

  async function addServiceArea() {
    const city = locationInput.trim();
    const state = stateInput.trim().toUpperCase();
    if (locationType === "city") {
      if (!city || !state) return;
      const val = `${city}, ${state}`;
      if (serviceAreas.some((a) => a.location_type === "city" && a.value === val)) return;
      const coords = await geocodeAddress(val);
      appendServiceArea({
        location_type: "city",
        value: val,
        lat: coords?.lat,
        lng: coords?.lng,
        radius_km: 25,
      });
      setLocationInput("");
      setStateInput("");
    } else {
      if (!city) return;
      if (serviceAreas.some((a) => a.location_type === "postal_code" && a.value === city)) return;
      const coords = await geocodeAddress(city);
      appendServiceArea({
        location_type: "postal_code",
        value: city,
        lat: coords?.lat,
        lng: coords?.lng,
        radius_km: 15,
      });
      setLocationInput("");
    }
  }

  const onSubmit = async (data: ProFormData) => {
    if (!userId) {
      setError("root", { message: "Not authenticated" });
      return;
    }
    try {
      await upsertPassPro(userId, {
        company_name: data.companyName || undefined,
        vehicle_make: data.vehicleMake,
        vehicle_model: data.vehicleModel,
        drivers_license: data.driversLicense,
        service_areas: data.serviceAreas.map(({ location_type, value, lat, lng, radius_km }) => ({
          location_type,
          value,
          lat,
          lng,
          radius_km,
        })),
      });
      await updateUserMetadata({ onboarding_complete: true });
      setOnboarded(true);
      router.replace("/(pro)" as Href);
    } catch (e) {
      setError("root", { message: e instanceof Error ? e.message : "Failed to save" });
    }
  };

  return (
    <VStack space="2xl">
      <VStack space="sm">
        <Text className="text-muted-foreground text-xs tracking-widest uppercase">
          Company Name <Text className="normal-case">(Optional)</Text>
        </Text>
        <Controller
          control={control}
          name="companyName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
              <InputField
                className="text-foreground py-3 text-base"
                placeholder="Smith Hauling Co."
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

      <HStack space="lg">
        <VStack space="sm" className="flex-1">
          <Text className="text-muted-foreground text-xs tracking-widest uppercase">
            Vehicle Make
          </Text>
          <Controller
            control={control}
            name="vehicleMake"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                <InputField
                  className="text-foreground py-3 text-base"
                  placeholder="Ford"
                  placeholderTextColor="#737373"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                />
              </Input>
            )}
          />
          {errors.vehicleMake && (
            <Text className="text-destructive text-xs">{errors.vehicleMake.message}</Text>
          )}
        </VStack>

        <VStack space="sm" className="flex-1">
          <Text className="text-muted-foreground text-xs tracking-widest uppercase">
            Vehicle Model
          </Text>
          <Controller
            control={control}
            name="vehicleModel"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                <InputField
                  className="text-foreground py-3 text-base"
                  placeholder="F-150"
                  placeholderTextColor="#737373"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                />
              </Input>
            )}
          />
          {errors.vehicleModel && (
            <Text className="text-destructive text-xs">{errors.vehicleModel.message}</Text>
          )}
        </VStack>
      </HStack>

      <VStack space="sm">
        <Text className="text-muted-foreground text-xs tracking-widest uppercase">
          Driver&apos;s License Number
        </Text>
        <Controller
          control={control}
          name="driversLicense"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
              <InputField
                className="text-foreground py-3 text-base"
                placeholder="D1234567"
                placeholderTextColor="#737373"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="characters"
              />
            </Input>
          )}
        />
        {errors.driversLicense && (
          <Text className="text-destructive text-xs">{errors.driversLicense.message}</Text>
        )}
      </VStack>

      <VStack space="md">
        <Text className="text-muted-foreground text-xs tracking-widest uppercase">
          Service Areas
        </Text>
        <HStack space="sm">
          <Pressable
            onPress={() => {
              setLocationType("city");
              setLocationInput("");
              setStateInput("");
            }}
            className={`border-b px-3 py-3 ${locationType === "city" ? "border-brand" : "border-border"}`}
          >
            <Text
              className={`text-sm font-medium ${locationType === "city" ? "text-brand" : "text-muted-foreground"}`}
            >
              City
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setLocationType("postal_code");
              setLocationInput("");
              setStateInput("");
            }}
            className={`border-b px-3 py-3 ${locationType === "postal_code" ? "border-brand" : "border-border"}`}
          >
            <Text
              className={`text-sm font-medium ${locationType === "postal_code" ? "text-brand" : "text-muted-foreground"}`}
            >
              Postal Code
            </Text>
          </Pressable>
        </HStack>
        <HStack space="sm">
          <Input className="border-border flex-1 rounded-none border-0 border-b px-0 shadow-none">
            <InputField
              className="text-foreground py-3 text-base"
              placeholder={locationType === "city" ? "City" : "e.g. 78701"}
              placeholderTextColor="#737373"
              value={locationInput}
              onChangeText={setLocationInput}
              onSubmitEditing={locationType === "city" ? undefined : addServiceArea}
              returnKeyType={locationType === "city" ? "next" : "done"}
              autoCapitalize={locationType === "city" ? "words" : "none"}
              keyboardType={locationType === "postal_code" ? "number-pad" : "default"}
            />
          </Input>
          {locationType === "city" && (
            <Input className="border-border w-16 rounded-none border-0 border-b px-0 shadow-none">
              <InputField
                className="text-foreground py-3 text-base"
                placeholder="ST"
                placeholderTextColor="#737373"
                value={stateInput}
                onChangeText={(v) => setStateInput(v.toUpperCase())}
                onSubmitEditing={addServiceArea}
                returnKeyType="done"
                autoCapitalize="characters"
                maxLength={2}
              />
            </Input>
          )}
          <Pressable onPress={addServiceArea} className="border-brand justify-center border-b px-4">
            <Text className="text-brand font-medium">Add</Text>
          </Pressable>
        </HStack>

        {serviceAreas.length > 0 && (
          <HStack className="flex-wrap gap-2">
            {serviceAreas.map((area, index) => (
              <View
                key={area.id}
                className="bg-muted flex-row items-center gap-1 rounded px-3 py-1"
              >
                <Text className="text-muted-foreground text-xs uppercase">
                  {area.location_type === "city" ? "City" : "ZIP"}
                </Text>
                <Text className="text-foreground text-sm">{area.value}</Text>
                <Pressable onPress={() => removeServiceArea(index)} hitSlop={8}>
                  <Text className="text-muted-foreground text-base leading-none">×</Text>
                </Pressable>
              </View>
            ))}
          </HStack>
        )}

        {errors.serviceAreas && (
          <Text className="text-destructive text-xs">{errors.serviceAreas.message}</Text>
        )}
      </VStack>

      {errors.root && <Text className="text-destructive text-sm">{errors.root.message}</Text>}

      <Button size="lg" onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
        {isSubmitting && <ButtonSpinner />}
        <ButtonText>Continue to Dashboard</ButtonText>
      </Button>
    </VStack>
  );
}

// ─── Screen ───────────────────────────────────────────────────────

export default function AccountDetailsScreen() {
  const role = useAuthStore((s) => s.role);

  return (
    <View className="bg-background flex-1">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="px-6 pt-16 pb-12">
            <Text className="text-foreground mb-16 text-xl font-medium tracking-tight">
              Haul<Text className="text-brand">Pass</Text>
            </Text>

            {role === "pro" ? (
              <>
                <Text className="text-foreground mb-3 text-4xl leading-tight font-light">
                  Set up your Pro profile.
                </Text>
                <Text className="text-muted-foreground mb-12 text-lg">
                  Tell us about your vehicle and where you haul.
                </Text>
                <ProForm />
              </>
            ) : (
              <>
                <Text className="text-foreground mb-3 text-4xl leading-tight font-light">
                  Where are you hauling from?
                </Text>
                <Text className="text-muted-foreground mb-12 text-lg">
                  Set your primary location to find the best Pass Pros in your neighborhood.
                </Text>
                <BuyerForm />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
