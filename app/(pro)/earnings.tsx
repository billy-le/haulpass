import { Text, View } from "react-native";

export default function EarningsScreen() {
  return (
    <View className="bg-background flex-1">
      <View className="bg-card border-border border-b px-6 pt-14 pb-6">
        <Text className="text-foreground text-[32px] font-normal" style={{ fontFamily: "Georgia" }}>
          Earnings
        </Text>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-muted-foreground text-[15px]">Earnings coming soon.</Text>
      </View>
    </View>
  );
}
