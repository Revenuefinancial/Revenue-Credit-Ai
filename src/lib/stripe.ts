import Stripe from "stripe";

// Lazy singleton — the secret key is only present at request time (and absent
// during builds before the client wires up Stripe), so we never touch it at
// module load. Throws a clear error if a Stripe route is hit without a key.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to the environment to enable checkout.",
    );
  }
  _stripe = new Stripe(key);
  return _stripe;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
