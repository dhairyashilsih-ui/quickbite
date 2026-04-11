const Razorpay = require('razorpay');
const crypto  = require('crypto');

// Initialise Razorpay with env keys (works for both Test & Live keys)
const getRazorpayInstance = () => {
  const key_id     = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set in environment variables.');
  }
  return new Razorpay({ key_id, key_secret });
};

/**
 * POST /api/payments/create-order
 * Body: { amount: Number (in INR), currency?: String, receipt?: String }
 * Returns: Razorpay order object + key_id for the frontend SDK
 */
const createRazorpayOrder = async (req, res) => {
  try {
    const razorpay  = getRazorpayInstance();
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || isNaN(amount) || Number(amount) < 1) {
      return res.status(400).json({ success: false, message: 'Invalid amount.' });
    }

    const options = {
      amount:   Math.round(Number(amount) * 100), // Razorpay works in paise
      currency,
      receipt:  receipt || `qb_${Date.now()}`,
      payment_capture: 1, // auto-capture
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success:  true,
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      key_id:   process.env.RAZORPAY_KEY_ID, // safe to send — it's the public key
    });
  } catch (err) {
    console.error('createRazorpayOrder Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to create payment order.' });
  }
};

/**
 * POST /api/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Verifies the HMAC-SHA256 signature Razorpay attaches to every successful payment.
 * Returns: { success: true } if signature is valid, 400 otherwise.
 */
const verifyPayment = (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details.' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body   = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    return res.status(200).json({
      success:            true,
      razorpay_payment_id,
      message:            'Payment verified successfully.',
    });
  } catch (err) {
    console.error('verifyPayment Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Payment verification error.' });
  }
};

module.exports = { createRazorpayOrder, verifyPayment };
