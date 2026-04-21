import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import "@/global.css";

if (__DEV__) {
  import("reactotron-react-native").then(({ default: Reactotron }) => {
    Reactotron.configure({ name: "Haulpass" }) // controls connection & communication settings
      .useReactNative() // add all built-in react native plugins
      .connect(); // let's connect!
  });
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, segments]);

  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
