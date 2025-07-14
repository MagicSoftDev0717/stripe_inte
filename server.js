// const express = require('express');
// const Stripe = require('stripe');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// app.use(cors());
// app.use(express.json());

// // Pay-per-send route
// app.post('/create-checkout-session/pay-per-send', async (req, res) => {
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     mode: 'payment',
//     line_items: [{
//       price: 'price_1Rka4DRU1fA8NXRMWKwM2fzT', // Replace with your actual price ID
//       quantity: 1,
//     }],
//     success_url: 'https://yourdomain.com/success',
//     cancel_url: 'https://yourdomain.com/cancel',
//   });

//   res.json({ url: session.url });
// });

// // Subscription route
// app.post('/create-checkout-session/membership', async (req, res) => {
//   const { email } = req.body;

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     mode: 'subscription',
//     line_items: [{
//       price: 'price_1Rka5XRU1fA8NXRMv5k4BZOw', // Replace with your actual price ID
//       quantity: 1,
//     }],
//     customer_email: email,
//     success_url: 'https://www.correctthecontract.com/artist?session_id={CHECKOUT_SESSION_ID}',
//     cancel_url: 'https://yourdomain.com/membership-cancel',
//   });

//   res.json({ url: session.url });
// });

// app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
//   const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

//   let event;
//   try {
//     event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], endpointSecret);
//   } catch (err) {
//     console.error("❌ Webhook signature verification failed:", err.message);
//     return res.sendStatus(400);
//   }

//   if (event.type === 'checkout.session.completed') {
//     const session = event.data.object;
//     const email = session.customer_email;

//     // Lookup the Firebase user by email
//     const admin = require('firebase-admin');
//     if (!admin.apps.length) {
//       admin.initializeApp({
//         credential: admin.credential.applicationDefault(),
//       });
//     }

//     const db = admin.firestore();
//     const auth = admin.auth();

//     try {
//       const user = await auth.getUserByEmail(email);

//       const startDate = new Date();
//       const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

//       await db.collection('memberships').doc(user.uid).set({
//         email,
//         startDate: startDate.toISOString(),
//         endDate: endDate.toISOString(),
//         requestQuota: 3
//       });

//       console.log("✅ Membership created for:", email);
//     } catch (e) {
//       console.error("❌ Error creating membership:", e);
//     }
//   }

//   res.json({ received: true });
// });


// app.listen(4242, () => console.log('Server running on port 4242'));


const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
require('dotenv').config();

// Init Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Create Stripe Checkout Session for Membership
app.post('/create-checkout-session/membership', async (req, res) => {
  const { email } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1Rka5XRU1fA8NXRMv5k4BZOw', // your membership price ID
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: 'https://www.correctthecontract.com/artist?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.correctthecontract.com/membership-cancel',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Failed to create session:", err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Stripe Webhook to confirm payment and create membership
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const auth = admin.auth();

    try {
      const user = await auth.getUserByEmail(email);

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      await db.collection('memberships').doc(user.uid).set({
        email: user.email,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        requestQuota: 3,
      });

      console.log("✅ Membership granted to:", user.email);
    } catch (err) {
      console.error("❌ Failed to create membership:", err);
    }
  }

  res.json({ received: true });
});

app.listen(4242, () => console.log('✅ Server running on http://localhost:4242'));