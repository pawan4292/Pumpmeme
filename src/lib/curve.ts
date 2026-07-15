/**
 * Bonding Curve Mathematics for PumpMeme
 *
 * Linear bonding curve: price = CURVE_SLOPE * supply
 * Integral gives cost to buy/sell:
 *   cost(s1->s2) = CURVE_SLOPE/2 * (s2^2 - s1^2)
 *
 * The curve reserve starts at exactly the real creation fee paid (2 UCT),
 * never a hardcoded starting value beyond that initial seed.
 */

import { CURVE_SLOPE } from './constants';

/**
 * Spot price at a given supply level (in UCT per token)
 */
export function price(supply: number): number {
  return CURVE_SLOPE * supply;
}

/**
 * Cost to buy `amount` tokens starting from current supply `currentSupply`
 * Returns cost in UCT
 */
export function buyPrice(currentSupply: number, amount: number): number {
  const s1 = currentSupply;
  const s2 = currentSupply + amount;
  return (CURVE_SLOPE / 2) * (s2 * s2 - s1 * s1);
}

/**
 * Payout for selling `amount` tokens from current supply `currentSupply`
 * Returns payout in UCT (includes 2% fee going to reserve)
 */
export function sellPayout(currentSupply: number, amount: number): number {
  if (amount > currentSupply) return 0;
  const s1 = currentSupply - amount;
  const s2 = currentSupply;
  const gross = (CURVE_SLOPE / 2) * (s2 * s2 - s1 * s1);
  // 2% sell fee stays in reserve (protocol fee)
  return gross * 0.98;
}

/**
 * Market cap at current supply (in UCT)
 * market_cap = price(supply) * supply
 */
export function marketCap(supply: number): number {
  return price(supply) * supply;
}

/**
 * Calculate the reserve ratio (curve health check)
 * Ensures solvency: reserve >= integral from 0 to supply
 */
export function requiredReserve(supply: number): number {
  return (CURVE_SLOPE / 2) * supply * supply;
}

/**
 * Given a reserve amount and curve, back-calculate supply
 */
export function supplyFromReserve(reserve: number): number {
  // reserve = CURVE_SLOPE/2 * supply^2  =>  supply = sqrt(2*reserve/CURVE_SLOPE)
  return Math.sqrt((2 * reserve) / CURVE_SLOPE);
}

/**
 * Price impact of a buy (%)
 */
export function priceImpact(currentSupply: number, amount: number): number {
  const priceBefore = price(currentSupply);
  const priceAfter = price(currentSupply + amount);
  if (priceBefore === 0) return 0;
  return ((priceAfter - priceBefore) / priceBefore) * 100;
}
