import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect } from "react";

import { useColorScheme } from "@/hooks/use-color-scheme";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { SafeAreaListener } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Uniwind } from "uniwind";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/auth.store";

export const unstable_settings = {
  anchor: "(auth)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [setSession]);

  return (
    <SafeAreaListener
      onChange={({ insets }) => {
        Uniwind.updateInsets(insets);
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GluestackUIProvider mode="dark">
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <QueryClientProvider client={queryClient}>
              <Stack>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                <Stack.Screen name="(buyer)" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="auto" />
            </QueryClientProvider>
          </ThemeProvider>
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
