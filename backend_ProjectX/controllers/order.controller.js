const { supabase } = require('../config/supabase');

/**
 * Create a new order
 */
const createOrder = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { items, address, paymentMethod, subtotal, deliveryFee, platformFee, discount, total } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    // Generate a readable Order ID
    const orderId = 'QB' + Date.now().toString().slice(-8).toUpperCase();

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_id: orderId,
        user_id,
        items: JSON.stringify(items),
        address,
        payment_method: paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        platform_fee: platformFee,
        discount,
        total,
        status: 'Placed',
        status_timestamps: JSON.stringify({ Placed: new Date().toISOString() }),
      })
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, order: { ...order, items: JSON.parse(order.items), status_timestamps: JSON.parse(order.status_timestamps) } });
  } catch (err) {
    console.error('createOrder Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to create order.' });
  }
};

/**
 * Get orders for the logged-in customer
 */
const getMyOrders = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const parsed = (orders || []).map(o => ({
      ...o,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      status_timestamps: typeof o.status_timestamps === 'string' ? JSON.parse(o.status_timestamps) : (o.status_timestamps || {}),
    }));

    return res.status(200).json({ success: true, orders: parsed });
  } catch (err) {
    console.error('getMyOrders Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
};

/**
 * Get ALL orders (Admin view)
 */
const getAllOrders = async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const parsed = (orders || []).map(o => ({
      ...o,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      status_timestamps: typeof o.status_timestamps === 'string' ? JSON.parse(o.status_timestamps) : (o.status_timestamps || {}),
    }));

    return res.status(200).json({ success: true, orders: parsed });
  } catch (err) {
    console.error('getAllOrders Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
};

/**
 * Update order status (Admin only)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID = ['Placed', 'Accepted', 'Processed', 'Dispatched', 'Delivered'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    // First fetch existing order to get current timestamps
    const { data: existing, error: fetchError } = await supabase
      .from('orders')
      .select('status_timestamps')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const timestamps = typeof existing.status_timestamps === 'string'
      ? JSON.parse(existing.status_timestamps)
      : (existing.status_timestamps || {});

    timestamps[status] = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status, status_timestamps: JSON.stringify(timestamps) })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      order: {
        ...updated,
        items: typeof updated.items === 'string' ? JSON.parse(updated.items) : updated.items,
        status_timestamps: timestamps,
      }
    });
  } catch (err) {
    console.error('updateOrderStatus Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
};

module.exports = { createOrder, getMyOrders, getAllOrders, updateOrderStatus };
