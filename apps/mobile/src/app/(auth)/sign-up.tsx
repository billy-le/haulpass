import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Button,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "expo-router";

const signUpSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((schema) => schema.password === schema.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignUpData = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const router = useRouter();
  const form = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignUpData) {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/registration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email_address: data.email,
            password: data.password,
            confirm_password: data.confirmPassword,
          }),
        },
      );
      if (res.ok) {
        router.push("/(tabs)");
      }
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <SafeAreaView>
      <View className="p-20 gap-6">
        <Controller
          control={form.control}
          name="email"
          render={({ field }) => (
            <TextInput
              placeholder="Email"
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              value={field.value}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              className="bg-blue-100 px-3 py-2 rounded-md"
            />
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field }) => (
            <TextInput
              placeholder="Password"
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              value={field.value}
              secureTextEntry
              autoComplete="password"
              autoCapitalize="none"
              className="bg-blue-100 px-3 py-2 rounded-md"
            />
          )}
        />
        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <TextInput
              placeholder="Confirm Password"
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              value={field.value}
              secureTextEntry
              autoComplete="password"
              autoCapitalize="none"
              className="bg-blue-100 px-3 py-2 rounded-md"
            />
          )}
        />

        {form.formState.isSubmitting ? (
          <ActivityIndicator />
        ) : (
          <Button title="Sign Up" onPress={form.handleSubmit(onSubmit)} />
        )}
      </View>

      <View className="justify-center items-center">
        <TouchableOpacity
          onPress={() => {
            router.replace("/sign-in");
          }}
        >
          <Text className="text-gray-500">
            Already have an account?{" "}
            <Text className="font-bold text-gray-800">Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
