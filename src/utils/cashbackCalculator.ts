import { CashbackSettings, TierRule } from '../types/cashback';

export interface CalculationResult {
  effectivePercentage: number;
  cashbackAmount: number;
  rawAmount: number;
  isCapped: boolean;
  isBelowMinimum: boolean;
  appliedTier?: TierRule;
  breakdown: string;
}

export function calculateCashback(
  purchaseAmount: number,
  settings: CashbackSettings,
  customPercentageOverride?: number
): CalculationResult {
  const safeAmount = Math.max(0, Number(purchaseAmount) || 0);

  // Check minimum spend
  if (safeAmount < settings.minPurchaseAmount) {
    return {
      effectivePercentage: 0,
      cashbackAmount: 0,
      rawAmount: 0,
      isCapped: false,
      isBelowMinimum: true,
      breakdown: `Belanja Rp ${safeAmount.toLocaleString('id-ID')} di bawah batas minimum (Rp ${settings.minPurchaseAmount.toLocaleString('id-ID')}). Cashback = Rp 0.`,
    };
  }

  let effectiveRate = 0;
  let appliedTier: TierRule | undefined;

  // Custom override has highest priority
  if (typeof customPercentageOverride === 'number' && !isNaN(customPercentageOverride)) {
    effectiveRate = customPercentageOverride;
  } else if (settings.mode === 'flat') {
    effectiveRate = settings.flatPercentage;
  } else {
    // Tiered mode
    const matchedTier = settings.tiers.find((tier) => {
      const matchMin = safeAmount >= tier.minSpend;
      const matchMax = tier.maxSpend === null || safeAmount <= tier.maxSpend;
      return matchMin && matchMax;
    });

    if (matchedTier) {
      effectiveRate = matchedTier.percentage;
      appliedTier = matchedTier;
    } else {
      // Fallback to highest or default
      effectiveRate = settings.flatPercentage;
    }
  }

  // Calculate raw cashback
  const rawCashback = (safeAmount * effectiveRate) / 100;
  let finalCashback = rawCashback;
  let isCapped = false;

  // Apply maximum cap if specified
  if (
    settings.maxCashbackPerTransaction !== null &&
    settings.maxCashbackPerTransaction > 0 &&
    finalCashback > settings.maxCashbackPerTransaction
  ) {
    finalCashback = settings.maxCashbackPerTransaction;
    isCapped = true;
  }

  // Apply rounding
  if (settings.rounding === 'round_hundred') {
    finalCashback = Math.round(finalCashback / 100) * 100;
  } else if (settings.rounding === 'round_thousand') {
    finalCashback = Math.round(finalCashback / 1000) * 1000;
  } else {
    finalCashback = Math.round(finalCashback);
  }

  let breakdown = `Rp ${safeAmount.toLocaleString('id-ID')} × ${effectiveRate}% = Rp ${Math.round(rawCashback).toLocaleString('id-ID')}`;
  if (isCapped) {
    breakdown += ` (Dibatasi maks. Rp ${settings.maxCashbackPerTransaction?.toLocaleString('id-ID')})`;
  }
  if (settings.rounding !== 'exact') {
    breakdown += ` [Dibulatkan: Rp ${finalCashback.toLocaleString('id-ID')}]`;
  }

  return {
    effectivePercentage: effectiveRate,
    cashbackAmount: finalCashback,
    rawAmount: rawCashback,
    isCapped,
    isBelowMinimum: false,
    appliedTier,
    breakdown,
  };
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value || 0);
}
