import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { supabase } from "@/services/supabase";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { Modal, ModalBackdrop, ModalContent } from "@/components/ui/modal";

async function deleteAccount(accessToken: string): Promise<void> {
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(await res.text());
}

export default function AccountScreen() {
  const router = useRouter();
  const firstName = useAuthStore((s) => s.firstName);
  const lastName = useAuthStore((s) => s.lastName);
  const session = useAuthStore((s) => s.session);
  const clear = useAuthStore((s) => s.clear);

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
        {firstName} {lastName}
      </Text>
      <Text className="text-muted-foreground mb-12 text-sm">Buyer</Text>

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

      <Modal isOpen={showDeleteModal} onClose={() => !deleting && setShowDeleteModal(false)}>
        <ModalBackdrop />
        <ModalContent className="bg-background mx-0 mb-0 self-end rounded-none px-6 pt-8 pb-12">
          <Text
            className="text-foreground mb-3 text-[22px] font-normal"
            style={{ fontFamily: "Georgia" }}
          >
            Delete your account?
          </Text>
          <Text className="text-muted-foreground mb-2 text-sm leading-relaxed">
            This action is permanent and cannot be undone.
          </Text>
          <Text className="text-muted-foreground mb-8 text-sm leading-relaxed">
            Your active and completed hauls will be retained for record-keeping. All other data will
            be permanently removed.
          </Text>

          {deleteError && <Text className="text-destructive mb-4 text-sm">{deleteError}</Text>}

          <VStack space="md">
            <Button
              variant="destructive"
              size="lg"
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting && <ButtonSpinner />}
              <ButtonText>Delete My Account</ButtonText>
            </Button>

            <Pressable
              onPress={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="items-center py-4"
            >
              <Text className="text-foreground text-sm font-medium tracking-widest uppercase">
                Cancel
              </Text>
            </Pressable>
          </VStack>
        </ModalContent>
      </Modal>
    </View>
  );
}
