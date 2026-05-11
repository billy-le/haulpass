import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { updateUserMetadata } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import type { Role } from "@/types/auth.types";

interface RoleCardProps {
  tag: string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

function RoleCard({ tag, title, description, selected, onPress }: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`bg-card rounded border-2 p-5 ${selected ? "border-brand" : "border-border"}`}
    >
      <Text
        className={`mb-2 text-xs font-semibold tracking-widest uppercase ${selected ? "text-brand" : "text-muted-foreground"}`}
      >
        {tag}
      </Text>
      <Text className="text-foreground mb-1 text-lg font-medium">{title}</Text>
      <Text className="text-muted-foreground text-sm leading-relaxed">{description}</Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const setRole = useAuthStore((s) => s.setRole);
  const [selected, setSelected] = useState<Role>("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setLoading(true);
    setError(null);
    try {
      setRole(selected);
      await updateUserMetadata({ role: selected });
      router.push("/(onboarding)/account-details");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save role");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="bg-background flex-1 px-6 pt-16 pb-12">
      <Text className="text-foreground mb-16 text-xl font-medium tracking-tight">
        Haul<Text className="text-brand">Pass</Text>
      </Text>

      <Text className="text-foreground mb-12 text-4xl leading-tight font-light">
        How will you use HaulPass?
      </Text>

      <VStack space="lg" className="flex-1">
        <RoleCard
          tag="For Furniture Hunters"
          title="I am a Buyer"
          description="I need help moving furniture or large items I've purchased from a marketplace."
          selected={selected === "buyer"}
          onPress={() => setSelected("buyer")}
        />
        <RoleCard
          tag="For Delivery Specialists"
          title="I am a Pass Pro"
          description="I have a truck or van and want to earn money helping people move items across town."
          selected={selected === "pro"}
          onPress={() => setSelected("pro")}
        />
      </VStack>

      {error !== null && <Text className="text-destructive mb-4 text-sm">{error}</Text>}

      <VStack space="lg">
        <Button size="lg" onPress={handleContinue} disabled={loading}>
          {loading && <ButtonSpinner />}
          <ButtonText>Continue</ButtonText>
        </Button>
        <Text className="text-muted-foreground text-center text-sm">
          You can switch roles later in your profile.
        </Text>
      </VStack>
    </View>
  );
}
