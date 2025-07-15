const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();

const stripe = Stripe(functions.config().stripe.secret); // will load from env

exports.createStripeSession = functions.https.onRequest(async (req, res) => {
  // Allow CORS
  res.set("Access-Control-Allow-Origin", "https://www.correctthecontract.com");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.status(204).send('');
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).send({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({ error: "Missing email" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1Rka5XRU1fA8NXRMv5k4BZOw', // ← Replace with your actual price ID
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: 'https://www.correctthecontract.com/artist?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.correctthecontract.com/membership-cancel',
    });

    res.send({ url: session.url });
  } catch (error) {
    console.error("❌ Stripe error:", error);
    res.status(500).send({ error: "Stripe session creation failed" });
  }
});
