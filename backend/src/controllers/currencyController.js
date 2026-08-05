import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as currencyService from '../services/currencyService.js';

export const getExchangeRate = asyncHandler(async (req, res) => {
  const { refresh } = req.query;
  
  // Force refresh if requested
  if (refresh === 'true') {
    currencyService.clearExchangeRateCache();
  }
  
  const rate = await currencyService.getExchangeRate();
  
  res.status(200).json(new ApiResponse(200, 'Exchange rate retrieved', rate));
});

export const convertAmount = asyncHandler(async (req, res) => {
  const { amount } = req.query;
  
  if (!amount || isNaN(amount)) {
    throw new Error('Valid amount is required');
  }
  
  const amountLKR = parseFloat(amount);
  const converted = await currencyService.convertLKRtoUSD(amountLKR);
  
  res.status(200).json(new ApiResponse(200, 'Amount converted', converted));
});

export default {
  getExchangeRate,
  convertAmount,
};
