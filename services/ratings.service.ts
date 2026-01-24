import { supabase } from "@/lib/supabase";

export interface RatingData {
  trip_session_id: number;
  rater_id: string;
  ratee_id: string;
  rating: number;
  comment?: string;
}

export const ratingsService = {
  /**
   * Saves a single rating to the ratings table.
   */
  async saveRating(data: RatingData) {
    const { error } = await supabase.from("ratings").insert([
      {
        trip_session_id: data.trip_session_id,
        rater_id: data.rater_id,
        ratee_id: data.ratee_id,
        rating: data.rating,
        comment: data.comment,
      },
    ]);

    if (error) {
      console.error("Error saving rating:", error);
      throw error;
    }
    return true;
  },

  /**
   * Saves multiple ratings (useful for drivers rating many passengers).
   */
  async saveMultipleRatings(ratings: RatingData[]) {
    const { error } = await supabase.from("ratings").insert(
      ratings.map((r) => ({
        trip_session_id: r.trip_session_id,
        rater_id: r.rater_id,
        ratee_id: r.ratee_id,
        rating: r.rating,
        comment: r.comment,
      }))
    );

    if (error) {
      console.error("Error saving multiple ratings:", error);
      throw error;
    }
    return true;
  },

  /**
   * Calculates the lifetime average rating for a single user.
   */
  async getUserRating(userId: string) {
    const { data, error } = await supabase
      .from("ratings")
      .select("rating")
      .eq("ratee_id", userId);

    if (error) {
      console.error("Error fetching user rating:", error);
      return { rating: 0, count: 0 };
    }

    if (!data || data.length === 0) return { rating: 0, count: 0 };

    const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
    return {
      rating: Number((sum / data.length).toFixed(1)),
      count: data.length,
    };
  },

  /**
   * Calculates average ratings for multiple users in a single pass.
   */
  async getUsersRatings(userIds: string[]) {
    if (userIds.length === 0) return {};

    const { data, error } = await supabase
      .from("ratings")
      .select("ratee_id, rating")
      .in("ratee_id", userIds);

    if (error) {
      console.error("Error fetching users ratings:", error);
      return {};
    }

    const results: Record<string, { rating: number; count: number }> = {};
    
    // Initialize results for all requested IDs
    userIds.forEach(id => {
      results[id] = { rating: 0, count: 0 };
    });

    // Group and calculate
    const grouped: Record<string, number[]> = {};
    data.forEach((r) => {
      if (!grouped[r.ratee_id]) grouped[r.ratee_id] = [];
      grouped[r.ratee_id].push(r.rating);
    });

    Object.keys(grouped).forEach((id) => {
      const g = grouped[id];
      const sum = g.reduce((a, b) => a + b, 0);
      results[id] = {
        rating: Number((sum / g.length).toFixed(1)),
        count: g.length,
      };
    });

    return results;
  },
};
