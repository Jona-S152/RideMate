import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import { useAppInsets } from "@/hooks/useAppInsets";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { ThemedText } from "../ThemedText";

interface AvatarStudioModalProps {
    visible: boolean;
    setVisible: (isVisible: boolean) => void;
    onApply: (url: string) => void;
}

const SKIN_COLOR_OPTIONS = ["614335", "ae5d29", "d08b5b", "edb98a", "f8d25c", "ffdbb4"];
const TOP_OPTIONS = ["bigHair", "bob", "bun", "curly", "curvy", "dreads", "dreads01", "dreads02", "frida", "frizzle", "fro", "froBand", "hat", "hijab", "longButNotTooLong", "miaWallace", "shaggy", "shaggyMullet", "shavedSides", "shortCurly", "shortFlat", "shortRound", "shortWaved", "sides", "straight01", "straight02", "straightAndStrand", "theCaesar", "theCaesarAndSidePart", "turban", "winterHat02", "winterHat03", "winterHat04", "winterHat1"];
const CLOTHES_OPTIONS = ["blazerAndShirt", "blazerAndSweater", "collarAndSweater", "graphicShirt", "hoodie", "overall", "shirtCrewNeck", "shirtScoopNeck", "shirtVNeck"];
const EYEBROWS_OPTIONS = ["angry", "angryNatural", "default", "defaultNatural", "flatNatural", "frownNatural", "raisedExcited", "raisedExcitedNatural", "sadConcerned", "sadConcernedNatural", "unibrowNatural", "upDown", "upDownNatural"];
const EYES_OPTIONS = ["closed", "cry", "default", "eyeRoll", "happy", "hearts", "side", "squint", "surprised", "wink", "winkWacky", "xDizzy"];
const MOUTH_OPTIONS = ["concerned", "default", "disbelief", "eating", "grimace", "sad", "screamOpen", "serious", "smile", "tongue", "twinkle", "vomit"];
const ACCESSORIES_OPTIONS = ["eyepatch", "kurt", "prescription01", "prescription02", "round", "sunglasses", "wayfarers"];
const FACIAL_HAIR_OPTIONS = ["beardLight", "beardMajestic", "beardMedium", "moustacheFancy", "moustacheMagnum"];

const TABS = ["Random", "Piel", "Pelo", "Ropa", "Ojos", "Cejas", "Boca", "Accesorios", "Barba"];

export default function AvatarStudioModal({ visible, setVisible, onApply }: AvatarStudioModalProps) {
    const { user } = useAuth();
    const insets = useAppInsets();

    const [seed, setSeed] = useState(user?.id);
    const [skinColor, setSkinColor] = useState<string | null>(null);
    const [top, setTop] = useState<string | null>(null);
    const [clothes, setClothes] = useState<string | null>(null);
    const [eyebrows, setEyebrows] = useState<string | null>(null);
    const [eyes, setEyes] = useState<string | null>(null);
    const [mouth, setMouth] = useState<string | null>(null);
    const [accessories, setAccessories] = useState<string | null>(null);
    const [facialHair, setFacialHair] = useState<string | null>(null);


    const [activeTab, setActiveTab] = useState("Random");
    const [loadingImage, setLoadingImage] = useState(false);

    const generateUrl = () => {
        let url = `https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&size=256&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
        if (skinColor) url += `&skinColor=${skinColor}`;
        if (top) url += `&top=${top}`;
        if (clothes) url += `&clothes=${clothes}`;
        if (eyebrows) url += `&eyebrows=${eyebrows}`;
        if (eyes) url += `&eyes=${eyes}`;
        if (mouth) url += `&mouth=${mouth}`;
        if (accessories) url += `&accessories=${accessories}`;
        if (facialHair) url += `&facialHair=${facialHair}`;
        return url;
    };

    const currentUrl = generateUrl();

    const handleRandomize = () => {
        setSeed(Math.random().toString(36).substring(7));
        setSkinColor(null);
        setTop(null);
        setClothes(null);
        setEyebrows(null);
        setEyes(null);
        setMouth(null);
        setAccessories(null);
        setFacialHair(null);
    };

    const handleApply = () => {
        onApply(currentUrl);
        setVisible(false);
    };

    const renderOptions = () => {
        if (activeTab === "Random") {
            return (
                <View className="items-center justify-center h-48">
                    <Pressable
                        onPress={handleRandomize}
                        className="px-8 py-4 rounded-full flex-row items-center space-x-2"
                        style={{ backgroundColor: Colors.dark.success, elevation: 5, shadowColor: Colors.dark.text, shadowOpacity: 0.4, shadowRadius: 10 }}
                    >
                        <Ionicons name="dice-outline" size={24} color="white" />
                        <ThemedText className="text-white font-bold text-lg ml-2">Aleatorio Total</ThemedText>
                    </Pressable>
                    <ThemedText className="text-slate-400 text-center mt-4 px-8">
                        Genera un nuevo avatar completamente al azar.
                    </ThemedText>
                </View>
            );
        }

        let options: string[] = [];
        let selectedValue: string | null = null;
        let onSelect: (val: string) => void = () => { };

        if (activeTab === "Piel") {
            options = SKIN_COLOR_OPTIONS;
            selectedValue = skinColor;
            onSelect = (val) => setSkinColor(val);
        } else if (activeTab === "Pelo") {
            options = TOP_OPTIONS;
            selectedValue = top;
            onSelect = (val) => setTop(val);
        } else if (activeTab === "Ropa") {
            options = CLOTHES_OPTIONS;
            selectedValue = clothes;
            onSelect = (val) => setClothes(val);
        } else if (activeTab === "Ojos") {
            options = EYES_OPTIONS;
            selectedValue = eyes;
            onSelect = (val) => setEyes(val);
        } else if (activeTab === "Cejas") {
            options = EYEBROWS_OPTIONS;
            selectedValue = eyebrows;
            onSelect = (val) => setEyebrows(val);
        } else if (activeTab === "Boca") {
            options = MOUTH_OPTIONS;
            selectedValue = mouth;
            onSelect = (val) => setMouth(val);
        } else if (activeTab === "Accesorios") {
            options = ACCESSORIES_OPTIONS;
            selectedValue = accessories;
            onSelect = (val) => setAccessories(val);
        } else if (activeTab === "Barba") {
            options = FACIAL_HAIR_OPTIONS;
            selectedValue = facialHair;
            onSelect = (val) => setFacialHair(val);
        }

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-4 py-4" contentContainerStyle={{ paddingRight: 32 }}>
                {options.map((item) => {
                    const isSelected = selectedValue === item;
                    return (
                        <Pressable
                            key={item}
                            onPress={() => onSelect(item)}
                            className="mr-3 items-center justify-center"
                        >
                            <View
                                className={`w-16 h-16 rounded-2xl items-center justify-center border-2 ${isSelected ? 'border-indigo-400 bg-indigo-500/20' : 'border-slate-700 bg-slate-800'}`}
                            >
                                {activeTab === "Piel" ? (
                                    <View style={{ backgroundColor: `#${item}` }} className="w-10 h-10 rounded-full" />
                                ) : (
                                    <ThemedText className="text-xs text-white capitalize text-center px-1" numberOfLines={2}>
                                        {item}
                                    </ThemedText>
                                )}
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>
        );
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={() => setVisible(false)}
        >
            <View className="flex-1 justify-end bg-black/70">
                <View
                    className="w-full rounded-t-3xl overflow-hidden border-t border-slate-700"
                    style={{ backgroundColor: Colors.dark.primary, paddingBottom: 24 + insets.bottom }}
                >
                    {/* Header */}
                    <View className="p-5 flex-row items-center justify-between border-b border-slate-800">
                        <ThemedText className="text-xl font-bold text-white">
                            Crea tu avatar
                        </ThemedText>
                        <Pressable onPress={() => setVisible(false)} className="p-2 bg-slate-800 rounded-full">
                            <Ionicons name="close" size={20} color="white" />
                        </Pressable>
                    </View>

                    {/* Preview Area */}
                    <View className="items-center py-6 bg-slate-800/30">
                        <View className="w-40 h-40 rounded-full border-4 items-center justify-center overflow-hidden shadow-2xl relative" style={{ borderColor: Colors.dark.border, backgroundColor: Colors.dark.glassSoft }}>
                            <Image
                                source={{ uri: currentUrl }}
                                className="w-full h-full"
                                contentFit="contain"
                                onLoadStart={() => setLoadingImage(true)}
                                onLoadEnd={() => setLoadingImage(false)}
                            />
                            {loadingImage && (
                                <View className="absolute inset-0 items-center justify-center bg-black/20">
                                    <ActivityIndicator color={Colors.light.primary} />
                                </View>
                            )}
                        </View>
                        <ThemedText className="text-slate-400 mt-4 font-semibold text-sm tracking-widest uppercase">Vista Previa</ThemedText>
                    </View>

                    {/* Customization Tabs */}
                    <View className="mt-4">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 border-b border-slate-800 pb-2">
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab;
                                return (
                                    <Pressable
                                        key={tab}
                                        onPress={() => setActiveTab(tab)}
                                        className={`mr-6 pb-2 ${isActive ? 'border-b-2 border-indigo-500' : ''}`}
                                    >
                                        <ThemedText className={`font-semibold ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}>
                                            {tab}
                                        </ThemedText>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {/* Options */}
                        <View className="h-48 pt-2">
                            {renderOptions()}
                        </View>
                    </View>

                    {/* Actions */}
                    <View className="px-6 pt-4">
                        <Pressable
                            style={{ backgroundColor: Colors.light.secondary }}
                            className="w-full py-4 rounded-full items-center shadow-lg"
                            onPress={handleApply}
                        >
                            <ThemedText className="text-white font-bold text-lg">
                                Aplicar Avatar
                            </ThemedText>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
