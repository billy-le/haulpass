import { useEffect, useRef, useState } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { createHaul, parseListingUrl } from "@/services/haul.service";
import { fetchBuyerAddresses, formatAddress } from "@/services/address.service";
import { useAuthStore } from "@/stores/auth.store";

function ImageCarousel({ images }: { images: string[] }) {
  const { width } = useWindowDimensions();
  const imageWidth = width - 48; // 24px horizontal padding each side
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
        {images.length} image{images.length !== 1 ? "s" : ""} found
      </Text>
    </VStack>
  );
}

const schema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  pickup_location: z.string().min(1, "Pickup location is required"),
  dropoff_location: z.string().min(1, "Dropoff location is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RequestHaulScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  const [listingUrl, setListingUrl] = useState("");
  const [parsedImages, setParsedImages] = useState<string[]>([]);
  const [parseKey, setParseKey] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

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
    defaultValues: { item_name: "", pickup_location: "", dropoff_location: "", notes: "" },
  });

  useEffect(() => {
    if (addresses && addresses.length > 0) {
      setValue("dropoff_location", formatAddress(addresses[0]));
    }
  }, [addresses, setValue]);

  async function handleParse() {
    if (!listingUrl.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const result = await parseListingUrl(listingUrl.trim());
      if (result.title) {
        setValue("item_name", result.title, { shouldValidate: true });
      }
      setValue("pickup_location", "");
      setParseKey((k) => k + 1);
      setParsedImages(result.images);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Failed to parse listing");
    } finally {
      setParsing(false);
    }
  }

  const mutation = useMutation({
    mutationFn: createHaul,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hauls", userId] });
      router.replace("/(buyer)" as Href);
    },
    onError: (e) => {
      setError("root", { message: e instanceof Error ? e.message : "Failed to create haul" });
    },
  });

  const onSubmit = (data: FormData) =>
    mutation.mutate({
      ...data,
      photo_urls: parsedImages,
      listing_url: listingUrl.trim() || undefined,
      notes: data.notes || undefined,
    });

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
              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Listing URL
                </Text>
                <HStack space="sm" className="items-end">
                  <Input className="border-border flex-1 rounded-none border-0 border-b px-0 shadow-none">
                    <InputField
                      className="text-foreground py-3 text-base"
                      placeholder="https://craigslist.org/..."
                      placeholderTextColor="#737373"
                      value={listingUrl}
                      onChangeText={(v) => {
                        setListingUrl(v);
                        setParseError(null);
                      }}
                      keyboardType="url"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </Input>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handleParse}
                    disabled={parsing || !listingUrl.trim()}
                  >
                    {parsing && <ButtonSpinner />}
                    <ButtonText>{parsing ? "Parsing…" : "Parse"}</ButtonText>
                  </Button>
                </HStack>
                {parseError && <Text className="text-destructive text-xs">{parseError}</Text>}
                {parsedImages.length > 0 && <ImageCarousel key={parseKey} images={parsedImages} />}
              </VStack>

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Item Name
                </Text>
                <Controller
                  control={control}
                  name="item_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                      <InputField
                        className="text-foreground py-3 text-base"
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
                {errors.item_name && (
                  <Text className="text-destructive text-xs">{errors.item_name.message}</Text>
                )}
              </VStack>

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Pickup Location
                </Text>
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
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                      />
                    </Input>
                  )}
                />
                {errors.pickup_location && (
                  <Text className="text-destructive text-xs">{errors.pickup_location.message}</Text>
                )}
              </VStack>

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Dropoff Location
                </Text>
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
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                      />
                    </Input>
                  )}
                />
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
              </VStack>
            </VStack>

            {errors.root && (
              <Text className="text-destructive mb-4 text-sm">{errors.root.message}</Text>
            )}

            <Button size="lg" onPress={handleSubmit(onSubmit)} disabled={mutation.isPending}>
              {mutation.isPending && <ButtonSpinner />}
              <ButtonText>Review &amp; Pay</ButtonText>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
