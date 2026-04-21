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
import { useSessionStore } from '@/stores/session.store'

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

type SignInData = z.infer<typeof signInSchema>;

export default function SignIn() {
  const signIn = useSessionStore(state => state.signIn)
  const router = useRouter();
  const form = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignInData) {
    try {
      await signIn(data)
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
        {form.formState.isSubmitting ? (
          <ActivityIndicator />
        ) : (
          <Button title="Sign In" onPress={form.handleSubmit(onSubmit)} />
        )}
      </View>
      <View className="justify-center items-center">
        <TouchableOpacity
          onPress={() => {
            router.replace("/sign-up");
          }}
        >
          <Text className="text-gray-500">
            Don't have an account?{" "}
            <Text className="font-bold text-gray-800">Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
