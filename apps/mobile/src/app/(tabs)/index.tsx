import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TouchableOpacity } from "react-native";
import { useSessionStore } from '@/stores/session.store'
import { useRouter } from 'expo-router'

export default function HomeScreen() {
  const signOut = useSessionStore(state => state.signOut)
  const router = useRouter();

  async function onSignOut() {
    await signOut()
    router.replace('/sign-in')
  }
  return (
    <SafeAreaView>
      <Text>Welcome, Home!</Text>
      <TouchableOpacity onPress={onSignOut} className='bg-black px-3 py-2 rounded'>
        <Text className="text-white text-center">Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
