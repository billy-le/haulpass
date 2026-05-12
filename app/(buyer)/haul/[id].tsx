import { useState } from "react";
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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { fetchHaulById, updateHaul } from "@/services/haul.service";
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
  item_name: z.string().min(1, "Item name is required"),
  pickup_location: z.string().min(1, "Pickup location is required"),
  dropoff_location: z.string().min(1, "Dropoff location is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function HaulDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: haul, isLoading } = useQuery({
    queryKey: ["haul", id],
    queryFn: () => fetchHaulById(id),
    enabled: !!id,
  });

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
          item_name: haul.item_name,
          pickup_location: haul.pickup_location,
          dropoff_location: haul.dropoff_location,
          notes: haul.notes ?? "",
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => updateHaul(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["haul", id], updated);
      queryClient.invalidateQueries({ queryKey: ["hauls"] });
      router.back();
    },
    onError: (e) => {
      setError("root", { message: e instanceof Error ? e.message : "Failed to save changes" });
    },
  });

  if (isLoading || !haul) {
    return <View className="bg-background flex-1" />;
  }

  const Field = ({ label, name }: { label: string; name: keyof FormData }) => (
    <VStack space="sm">
      <Text className="text-muted-foreground text-xs tracking-widest uppercase">{label}</Text>
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
          {haul[name as keyof typeof haul] as string}
        </Text>
      )}
      {errors[name] && <Text className="text-destructive text-xs">{errors[name]?.message}</Text>}
    </VStack>
  );

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
                {haul.item_name}
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

              <Field label="Item Name" name="item_name" />
              <Field label="Pickup Location" name="pickup_location" />
              <Field label="Dropoff Location" name="dropoff_location" />

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

              {haul.listing_url && (
                <VStack space="sm">
                  <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                    Listing URL
                  </Text>
                  <Text className="text-foreground py-3 text-base" numberOfLines={1}>
                    {haul.listing_url}
                  </Text>
                </VStack>
              )}
            </VStack>

            {errors.root && (
              <Text className="text-destructive mb-4 text-sm">{errors.root.message}</Text>
            )}

            {editable && (
              <Button
                size="lg"
                onPress={handleSubmit((data) => mutation.mutate(data))}
                disabled={mutation.isPending || !isDirty}
              >
                {mutation.isPending && <ButtonSpinner />}
                <ButtonText>Save Changes</ButtonText>
              </Button>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
