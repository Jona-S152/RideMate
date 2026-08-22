import { supabase } from "@/lib/supabase";

export const configService = {
  /**
   * Fetches the standard passenger fare from the app_configurations table.
   * Defaults to 1.25 if the key or table is unavailable.
   */
  async getStandardPassengerFare(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("app_configurations")
        .select("value")
        .eq("key", "STANDARD_PASSENGER_FARE")
        .maybeSingle();

      if (error) {
        console.warn("[configService.getStandardPassengerFare] Error fetching fare config:", error);
        return 1.25;
      }

      if (data && data.value !== undefined && data.value !== null) {
        return Number(data.value);
      }

      return 1.25;
    } catch (e) {
      console.error("[configService.getStandardPassengerFare] Exception:", e);
      return 1.25;
    }
  },

  /**
   * Generic getter for any key in app_configurations.
   */
  async getConfigurationValue(key: string, fallback: number = 0): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("app_configurations")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (error || !data) return fallback;
      return Number(data.value);
    } catch (e) {
      console.error(`[configService.getConfigurationValue] Exception for key ${key}:`, e);
      return fallback;
    }
  }
};
