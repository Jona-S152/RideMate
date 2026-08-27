import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";
import Constants from "expo-constants";

export type FeedbackCategory = "bug" | "suggestion" | "ux_issue" | "general";

export interface FeedbackPayload {
  user_id: string;
  category: FeedbackCategory;
  message: string;
  screen_name?: string;
}

export const feedbackService = {
  /**
   * Envía feedback del usuario a la tabla `user_feedback` en Supabase.
   */
  async submitFeedback(payload: FeedbackPayload): Promise<void> {
    const appVersion =
      (Constants.expoConfig?.version as string | undefined) ?? "unknown";
    const platform = Platform.OS;

    const { error } = await supabase.from("user_feedback").insert([
      {
        user_id: payload.user_id,
        category: payload.category,
        message: payload.message,
        screen_name: payload.screen_name ?? "Home",
        app_version: appVersion,
        platform,
        status: "pending",
      },
    ]);

    if (error) {
      throw new Error(error.message);
    }
  },
};
