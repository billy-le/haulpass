import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { signUpWithEmail } from "@/services/auth.service";

const signupSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const submittedEmail = watch("email");

  const onSubmit = async (data: SignupFormData) => {
    try {
      await signUpWithEmail(data.email, data.password);
    } catch (e) {
      setError("root", { message: e instanceof Error ? e.message : "Sign up failed" });
    }
  };

  if (isSubmitSuccessful) {
    return (
      <View className="bg-background flex-1 px-6 pt-16">
        <Text className="text-foreground mb-16 text-xl font-medium tracking-tight">
          Haul<Text className="text-brand">Pass</Text>
        </Text>
        <Text className="text-foreground mb-4 text-3xl font-light">Check your email</Text>
        <Text className="text-muted-foreground mb-8 text-base">
          {"We sent a confirmation link to "}
          <Text className="text-foreground">{submittedEmail}</Text>
          {". Click it to activate your account."}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text className="text-foreground text-base">Back to sign in</Text>
        </Pressable>
      </View>
    );
  }

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

            <Text className="text-foreground mb-12 text-4xl leading-tight font-light">
              Create your account.
            </Text>

            <VStack space="2xl" className="mb-8">
              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Email Address
                </Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                      <InputField
                        className="text-foreground py-3 text-base"
                        placeholder="you@example.com"
                        placeholderTextColor="#737373"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
                    </Input>
                  )}
                />
                {errors.email && (
                  <Text className="text-destructive text-xs">{errors.email.message}</Text>
                )}
              </VStack>

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Password
                </Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                      <InputField
                        className="text-foreground py-3 text-base"
                        placeholder="••••••••"
                        placeholderTextColor="#737373"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry
                        autoComplete="new-password"
                      />
                    </Input>
                  )}
                />
                {errors.password && (
                  <Text className="text-destructive text-xs">{errors.password.message}</Text>
                )}
              </VStack>

              <VStack space="sm">
                <Text className="text-muted-foreground text-xs tracking-widest uppercase">
                  Confirm Password
                </Text>
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className="border-border rounded-none border-0 border-b px-0 shadow-none">
                      <InputField
                        className="text-foreground py-3 text-base"
                        placeholder="••••••••"
                        placeholderTextColor="#737373"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry
                        autoComplete="new-password"
                      />
                    </Input>
                  )}
                />
                {errors.confirmPassword && (
                  <Text className="text-destructive text-xs">{errors.confirmPassword.message}</Text>
                )}
              </VStack>
            </VStack>

            {errors.root && (
              <Text className="text-destructive mb-4 text-sm">{errors.root.message}</Text>
            )}

            <Button
              size="lg"
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="mb-6"
            >
              {isSubmitting && <ButtonSpinner />}
              <ButtonText>Create Account</ButtonText>
            </Button>

            <Pressable onPress={() => router.back()} className="items-center">
              <Text className="text-muted-foreground text-sm">
                {"Already have an account? "}
                <Text className="text-foreground">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
