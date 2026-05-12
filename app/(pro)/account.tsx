import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { supabase } from "@/services/supabase";
import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/services/profile.service";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";

async function deleteAccount(accessToken: string): Promise<void> {
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(await res.text());
}

export default function ProAccountScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const session = useAuthStore((s) => s.session);
  const clear = useAuthStore((s) => s.clear);

  const { data: profile } = useQuery({
    queryKey: ["user_profile", userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    clear();
  }

  async function handleDeleteAccount() {
    if (!session?.access_token) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(session.access_token);
      clear();
      router.replace("/(auth)/login" as Href);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  return (
    <View className="bg-background flex-1 px-6 pt-14">
      <Text
        className="text-foreground mb-1 text-[28px] font-normal"
        style={{ fontFamily: "Georgia" }}
      >
        {profile?.first_name} {profile?.last_name}
      </Text>
      <Text className="text-muted-foreground mb-12 text-sm">Pass Pro</Text>

      <VStack space="md">
        <Pressable onPress={handleSignOut} className="border-border items-center border py-4">
          <Text className="text-foreground text-sm font-medium tracking-widest uppercase">
            Sign Out
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowDeleteModal(true)}
          className="border-destructive items-center border py-4"
        >
          <Text className="text-destructive text-sm font-medium tracking-widest uppercase">
            Delete Account
          </Text>
        </Pressable>
      </VStack>

      <AlertDialog
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        size="md"
      >
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Text
              className="text-foreground text-[22px] font-normal"
              style={{ fontFamily: "Georgia" }}
            >
              Delete your account?
            </Text>
          </AlertDialogHeader>
          <AlertDialogBody>
            <VStack space="sm">
              <Text className="text-muted-foreground text-sm leading-relaxed">
                This action is permanent and cannot be undone.
              </Text>
              <Text className="text-muted-foreground text-sm leading-relaxed">
                Your active and completed hauls will be retained for record-keeping. All other data
                will be permanently removed.
              </Text>
              {deleteError && <Text className="text-destructive text-sm">{deleteError}</Text>}
            </VStack>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowDeleteModal(false)}
              isDisabled={deleting}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              size="sm"
              className="bg-destructive"
              onPress={handleDeleteAccount}
              isDisabled={deleting}
            >
              {deleting && <ButtonSpinner />}
              <ButtonText>Delete Account</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
