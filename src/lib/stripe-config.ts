// Stripe product and price configuration
export const STRIPE_PLANS = {
  pro: {
    name: "Pro",
    price: "$9.99",
    priceId: "price_1Sb8gUIHFoKvK2ctlf7ycfpK",
    productId: "prod_TYFANJ9HWryQur",
  },
  enterprise: {
    name: "Enterprise",
    price: "$29.99",
    priceId: "price_1Sb8gjIHFoKvK2ctkU04Xz8O",
    productId: "prod_TYFBYIV23faqq3",
  },
} as const;
