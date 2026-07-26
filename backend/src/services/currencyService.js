import ApiError from '../utils/ApiError.js';

// Cache exchange rates for 1 hour to avoid excessive API calls
let cachedRates = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Get exchange rates from a free API (frankfurter.app)
 * No API key required, completely free
 */
export const getExchangeRates = async () => {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (cachedRates && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=LKR');
    
    if (!response.ok) {
      throw new ApiError(503, 'Failed to fetch exchange rates');
    }

    const data = await response.json();
    
    // Cache the rates
    cachedRates = {
      base: data.base,
      date: data.date,
      rates: data.rates,
    };
    cacheTimestamp = now;
    
    return cachedRates;
  } catch (error) {
    // Fallback to approximate rate if API fails
    // 1 USD ≈ 320 LKR (approximate rate)
    console.warn('Currency API failed, using fallback rate');
    return {
      base: 'LKR',
      date: new Date().toISOString().split('T')[0],
      rates: {
        USD: 0.003125, // 1 LKR ≈ 0.003125 USD
      },
    };
  }
};

/**
 * Convert LKR to USD
 */
export const convertLKRtoUSD = async (amountLKR) => {
  const rates = await getExchangeRates();
  const usdRate = rates.rates.USD;
  
  if (!usdRate) {
    throw new ApiError(503, 'USD exchange rate not available');
  }
  
  const amountUSD = amountLKR * usdRate;
  return {
    lkr: amountLKR,
    usd: amountUSD,
    rate: usdRate,
  };
};

/**
 * Get current exchange rate for LKR to USD
 */
export const getExchangeRate = async () => {
  const rates = await getExchangeRates();
  return {
    lkrToUsd: rates.rates.USD,
    date: rates.date,
  };
};

export default {
  getExchangeRates,
  convertLKRtoUSD,
  getExchangeRate,
};
