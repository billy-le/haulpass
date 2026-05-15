/** A buyer's review of a pass pro after haul completion. */
export interface Review {
  id: string;
  haul_id: string;
  /** ID of the buyer who wrote the review. References `buyers.id`. */
  reviewer_id: string;
  /** ID of the pass pro being reviewed. References `pass_pros.id`. */
  reviewee_id: string;
  /** Star rating from 1 to 5. */
  rating: number;
  comment: string | null;
  created_at: string;
}

/** Fee breakdown for a single quote, calculated by the `get_quote_breakdown` DB function. */
export interface QuoteBreakdown {
  /** The pro's quoted amount in cents. */
  pro_amount_cents: number;
  /** Platform service fee in cents (15% of pro quote). */
  platform_fee_cents: number;
  /** Mileage fee in cents ($1.50 × distance_miles). */
  mileage_fee_cents: number;
  /** Sum of all fees in cents. */
  total_cents: number;
  /** Driving distance in miles used for mileage calculation. Null if not yet set on the haul. */
  distance_miles: number | null;
}
