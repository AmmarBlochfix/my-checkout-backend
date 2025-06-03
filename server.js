const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Root route to test server is running
app.get('/', (req, res) => {
  res.send('✅ Backend is running!');
});

// ✅ Function to send email
async function sendEmail(name, email, phone, product, method) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Checkout Bot" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `New ${method} order: ${product}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nProduct: ${product}\nMethod: ${method}`,
  });
}

// ✅ Checkout endpoint
app.post('/api/checkout', async (req, res) => {
  const { name, email, phone, product, price, method } = req.body;

  if (!name || !email || !phone || !product || !price || !method) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    await sendEmail(name, email, phone, product, method);

    if (method === 'crypto') {
      const response = await axios.post(
        'https://api.nowpayments.io/v1/invoice',
        {
          price_amount: price,
          price_currency: 'usd',
          pay_currency: 'btc',
          order_id: product,
          order_description: `Order for ${product}`,
          success_url: 'https://yourdomain.com/success.html',
          cancel_url: 'https://yourdomain.com/cancel.html',
        },
        {
          headers: {
            'x-api-key': process.env.NOWPAYMENTS_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      return res.json({ url: response.data.invoice_url });
    } else if (method === 'card') {
      const gardarianUrl = `https://widget.gardarian.com/payment?amount=${price}&fiat_type=usd&crypto=btc&email=${encodeURIComponent(
        email
      )}`;
      return res.json({ url: gardarianUrl });
    }

    res.status(400).json({ error: 'Invalid method' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Payment error' });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
