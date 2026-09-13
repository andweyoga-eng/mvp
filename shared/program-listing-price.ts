import { programPaiseToRupees } from "./programs";

export type ProgramListingPrice = {
  optionCount: number;
  minRupees: number;
};

export function summarizeListingPrice(pricesPaise: number[]): ProgramListingPrice | null {
  if (pricesPaise.length === 0) return null;
  const minPaise = Math.min(...pricesPaise.map((p) => Math.trunc(Number(p) || 0)));
  return {
    optionCount: pricesPaise.length,
    minRupees: programPaiseToRupees(minPaise),
  };
}

/** Signed-in listing copy. Multiple SKUs → "Starting at ₹X"; one SKU → "₹X". */
export function formatProgramListingPriceLabel(
  listing: ProgramListingPrice | null | undefined,
): string | null {
  if (!listing) return null;
  const amount = `₹${listing.minRupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return listing.optionCount > 1 ? `Starting at ${amount}` : amount;
}
