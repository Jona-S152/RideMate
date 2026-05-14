import { Colors } from "@/constants/Colors";
import GlassCard from "@/components/common/GlassCard";
import { ThemedText } from "../ui/ThemedText";

interface QuickActionCardProps {
    text: string
}

export default function QuickActionCard({ text }: QuickActionCardProps) {
    return (
        <GlassCard
            style={{
                width: 192,
                height: 192,
                padding: 4,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: Colors.dark.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 6,
            }}>
            <ThemedText 
                lightColor={Colors.dark.text} 
                darkColor={Colors.dark.text}
                className="text-2xl text-center"
            >
                {text}
            </ThemedText>
        </GlassCard>
    );
}