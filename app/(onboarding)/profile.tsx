import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { updateUserMetadata } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileScreen() {
  const router = useRouter();
  const firstName = useAuthStore((s) => s.firstName);
  const lastName = useAuthStore((s) => s.lastName);
  const userName = useAuthStore((s) => s.userName);

  const derivedFirst = firstName ?? (userName ? userName.split(" ")[0] : "") ?? "";
  const derivedLast = lastName ?? (userName ? userName.split(" ").slice(1).join(" ") : "") ?? "";

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: derivedFirst, lastName: derivedLast },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateUserMetadata({ first_name: data.firstName, last_name: data.lastName });
      router.push("/(onboarding)/onboarding");
    } catch (e) {
      setError("root", { message: e instanceof Error ? e.message : "Failed to save profile" });
    }
  };

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

            <Text className="text-foreground mb-3 text-4xl leading-tight font-light">
              What should we call you?
            </Text>
            <Text className="text-muted-foreground mb-12 text-lg">
              Used on your profile and haul requests.
            </Text>

            <VStack space="2xl" className="mb-8">
              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  First Name
                </Text>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                      <InputField
                        className="text-foreground py-3 text-base"
                        placeholder="Jane"
                        placeholderTextColor="#737373"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                        autoComplete="given-name"
                      />
                    </Input>
                  )}
                />
                {errors.firstName && (
                  <Text className="text-destructive text-xs">{errors.firstName.message}</Text>
                )}
              </VStack>

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Last Name
                </Text>
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                      <InputField
                        className="text-foreground py-3 text-base"
                        placeholder="Smith"
                        placeholderTextColor="#737373"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                        autoComplete="family-name"
                      />
                    </Input>
                  )}
                />
                {errors.lastName && (
                  <Text className="text-destructive text-xs">{errors.lastName.message}</Text>
                )}
              </VStack>
            </VStack>

            {errors.root && (
              <Text className="text-destructive mb-4 text-sm">{errors.root.message}</Text>
            )}

            <Button size="lg" onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting && <ButtonSpinner />}
              <ButtonText>Continue</ButtonText>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
