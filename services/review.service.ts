import { supabase } from "./supabase";
import type { Review } from "@/types/review.types";

/**
 * Fetches all reviews for a pass pro, ordered most recent first.
 *
 * @param proId - The pass pro's user ID (`pass_pros.id`).
 * @returns Array of reviews written by buyers for this pro.
 * @throws On Supabase query error.
 */
export async function fetchProReviews(proId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("reviewee_id", proId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Review[];
}

/**
 * Submits a buyer review for a pass pro on a completed haul.
 *
 * Enforced by RLS: caller must be the buyer on the haul, haul must be completed,
 * and they must not have already reviewed this haul.
 *
 * @param haulId - The completed haul's ID.
 * @param proId - The pass pro's user ID being reviewed.
 * @param rating - Star rating from 1 to 5.
 * @param comment - Optional written review.
 * @returns The newly created review record.
 * @throws On RLS violation or Supabase error.
 */
export async function submitReview(
  haulId: string,
  proId: string,
  rating: number,
  comment?: string,
): Promise<Review> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      haul_id: haulId,
      reviewer_id: user!.id,
      reviewee_id: proId,
      rating,
      comment: comment ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Review;
}
