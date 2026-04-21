declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL: string;
      EXPO_PUBLIC_ENABLE_LOGS?: "true" | "false";
      NODE_ENV: "development" | "production" | "test";
    }
  }
}

export {};
