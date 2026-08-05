import ApiError from '../utils/ApiError.js';

// Cache exchange rates for 10 minutes to get more current rates
let cachedRates = null;
let cacheTimestamp = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Clear the exchange rate cache (call this to force refresh)
 */
export const clearExchangeRateCache = () => {
  cachedRates = null;
  cacheTimestamp = null;
  console.log('Exchange rate cache cleared');
};

/**
 * Get exchange rates from a free API
 * Try multiple APIs in case one fails
 */
export const getExchangeRates = async () => {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (cachedRates && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('Using cached exchange rates:', cachedRates);
    return cachedRates;
  }

  // Try multiple APIs
  const apis = [
    {
      name: 'ExchangeRate-API',
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      parse: (data) => {
        const usdToLkr = data.rates.LKR;
        return {
          base: 'LKR',
          date: data.date,
          rates: {
            USD: 1 / usdToLkr,
          },
        };
      }
    },
    {
      name: 'Frankfurter',
      url: 'https://api.frankfurter.app/latest?from=USD&to=LKR',
      parse: (data) => {
        const usdToLkr = data.rates.LKR;
        return {
          base: 'LKR',
          date: data.date,
          rates: {
            USD: 1 / usdToLkr,
          },
        };
      }
    }
  ];

  for (const api of apis) {
    try {
      console.log(`Trying ${api.name} API...`);
      const response = await fetch(api.url);
      
      if (!response.ok) {
        console.warn(`${api.name} API returned non-OK status`);
        continue;
      }

      const data = await response.json();
      const rates = api.parse(data);
      
      // Cache the rates
      cachedRates = rates;
      cacheTimestamp = now;
      
      console.log(`Successfully fetched rates from ${api.name}:`, rates);
      return cachedRates;
    } catch (error) {
      console.warn(`${api.name} API failed:`, error.message);
      continue;
    }
  }

  // All APIs failed, use fallback with current approximate rate
  // As of 2024, 1 USD ≈ 310-320 LKR, using 315 as middle ground
  console.warn('All currency APIs failed, using fallback rate');
  return {
    base: 'LKR',
    date: new Date().toISOString().split('T')[0],
    rates: {
      USD: 0.0031746, // 1 LKR ≈ 0.0031746 USD (1 USD ≈ 315 LKR)
    },
  };
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
