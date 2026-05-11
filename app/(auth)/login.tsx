import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { signInWithApple, signInWithEmail, signInWithGoogle } from "@/services/auth.service";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signInWithEmail(data.email, data.password);
      router.replace("/(onboarding)/profile");
    } catch (e) {
      setError("root", {
        message: e instanceof Error ? e.message : "Sign in failed",
      });
    }
  };

  async function handleGoogleSignIn() {
    setOauthLoading("google");
    try {
      await signInWithGoogle();
      router.replace("/(onboarding)/profile");
    } catch (e) {
      setError("root", {
        message: e instanceof Error ? e.message : "Google sign in failed",
      });
    } finally {
      setOauthLoading(null);
    }
  }

  async function handleAppleSignIn() {
    setOauthLoading("apple");
    try {
      await signInWithApple();
      router.replace("/(onboarding)/profile");
    } catch (e) {
      setError("root", {
        message: e instanceof Error ? e.message : "Apple sign in failed",
      });
    } finally {
      setOauthLoading(null);
    }
  }

  const busy = isSubmitting || oauthLoading !== null;

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
              The future of furniture delivery.
            </Text>
            <Text className="text-muted-foreground mb-12 max-w-xs text-lg">
              Move big items from marketplace to doorstep with one tap.
            </Text>

            <VStack space="md" className="mb-6">
              <Button variant="outline" size="lg" onPress={handleGoogleSignIn} disabled={busy}>
                {oauthLoading === "google" && <ButtonSpinner />}
                <ButtonText>Continue with Google</ButtonText>
              </Button>

              {Platform.OS === "ios" && (
                <Button variant="outline" size="lg" onPress={handleAppleSignIn} disabled={busy}>
                  {oauthLoading === "apple" && <ButtonSpinner />}
                  <ButtonText>Continue with Apple</ButtonText>
                </Button>
              )}
            </VStack>

            <HStack space="md" className="mb-6 items-center">
              <View className="bg-border h-px flex-1" />
              <Text className="text-muted-foreground text-sm">or</Text>
              <View className="bg-border h-px flex-1" />
            </HStack>

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
                        autoComplete="password"
                      />
                    </Input>
                  )}
                />
                {errors.password && (
                  <Text className="text-destructive text-xs">{errors.password.message}</Text>
                )}
              </VStack>
            </VStack>

            {errors.root && (
              <Text className="text-destructive mb-4 text-sm">{errors.root.message}</Text>
            )}

            <Button size="lg" onPress={handleSubmit(onSubmit)} disabled={busy} className="mb-6">
              {isSubmitting && <ButtonSpinner />}
              <ButtonText>Sign In</ButtonText>
            </Button>

            <Pressable onPress={() => router.push("/(auth)/signup")} className="items-center">
              <Text className="text-muted-foreground text-sm">
                {"Don't have an account? "}
                <Text className="text-foreground">Sign up</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
