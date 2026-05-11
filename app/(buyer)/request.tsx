import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { createHaul } from "@/services/haul.service";
import { useAuthStore } from "@/stores/auth.store";

const schema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  pickup_location: z.string().min(1, "Pickup location is required"),
  dropoff_location: z.string().min(1, "Dropoff location is required"),
});

type FormData = z.infer<typeof schema>;

export default function RequestHaulScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { item_name: "", pickup_location: "", dropoff_location: "" },
  });

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

  const onSubmit = (data: FormData) => mutation.mutate(data);

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

            <Pressable className="border-border mb-8 items-center border border-dashed py-10">
              <Text className="text-muted-foreground text-sm">Tap to add photos of the item</Text>
            </Pressable>

            <VStack space="2xl" className="mb-8">
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
