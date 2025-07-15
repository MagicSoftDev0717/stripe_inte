const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const ALLOWED_ORIGIN = 'https://www.correctthecontract.com';
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: 'OK'
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: 'price_1Rka5XRU1fA8NXRMv5k4BZOw',
        quantity: 1,
      }],
      customer_email: email,
      success_url: `${ALLOWED_ORIGIN}/artist?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ALLOWED_ORIGIN}/membership-cancel`,
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    console.error("❌ Stripe session error:", err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ error: 'Session creation failed' })
    };
  }
};
