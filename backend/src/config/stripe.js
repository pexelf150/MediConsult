import Stripe from 'stripe';
import env from './env.js';

let stripe = null;

export const getStripe = () => {
  if (!env.stripe.secretKey) {
    return null;
  }

  if (!stripe) {
    stripe = new Stripe(env.stripe.secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }

  return stripe;
};

export default getStripe;
