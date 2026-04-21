import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "haulpass_session_token";

export const secureStorage = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  deleteToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
