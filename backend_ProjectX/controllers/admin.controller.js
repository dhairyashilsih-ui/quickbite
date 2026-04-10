const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { sendApprovalEmail } = require('../services/emailService');

/**
 * Get pending sellers for Super Admin
 */
const getPendingSellers = async (req, res) => {
  try {
    const { data: sellers, error } = await supabase
      .from('users')
      .select(`
        id, name, email, created_at,
        seller_profiles ( business_name, gstin, pan, fssai, bank_details, address_proof, upi_id )
      `)
      .eq('role', 'admin')
      .eq('status', 'pending');

    if (error) throw error;
    
    const mappedSellers = sellers.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      created_at: s.created_at,
      SellerProfile: s.seller_profiles?.[0] || null
    }));

    return res.status(200).json({ success: true, sellers: mappedSellers });
  } catch (err) {
    console.error('getPendingSellers Error:', err.message || err);
    return res.status(500).json({ success: false, message: 'Failed to fetch sellers.' });
  }
};

/**
 * Approve seller and send Magic Link email
 */
const approveSeller = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch user + their seller profile (for business name)
    const { data: user, error: findError } = await supabase
      .from('users')
      .select(`*, seller_profiles ( business_name )`)
      .eq('id', id)
      .single();

    if (findError || !user) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }
    if (user.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Seller already approved.' });
    }

    const businessName = user.seller_profiles?.[0]?.business_name || user.name || 'Your Business';

    // 1. Update status to active
    const { error: updateError } = await supabase.from('users').update({ status: 'active' }).eq('id', id);
    if (updateError) throw updateError;

    // 2. Generate Magic Link
    const token      = crypto.randomBytes(32).toString('hex');
    const expiresAt  = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await supabase.from('magic_links').insert({ user_id: user.id, token, expires_at: expiresAt });
    const magicUrl   = `http://localhost:5173/magic-login?token=${token}`;

    // 3. Send Approval Email via Gmail SMTP
    const emailSent = await sendApprovalEmail({
      toEmail:      user.email,
      sellerName:   user.name,
      businessName,
      magicUrl,
    });

    // 4. Log event
    await supabase.from('security_events').insert({ user_id: user.id, event: 'seller_approved', risk: 'low' });

    if (!emailSent) {
      return res.status(200).json({ 
        success: true, 
        message: 'Seller approved! Gmail SMTP is not configured, so the email was caught. Use this Magic Link manually:',
        magicLink: magicUrl 
      });
    }

    return res.status(200).json({ success: true, message: `Seller approved. Activation email sent to ${user.email}` });

  } catch (err) {
    console.error('approveSeller Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Approval error.' });
  }
};

/**
 * Get all users and sellers for Super Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, name, email, role, status, created_at,
        seller_profiles ( business_name )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('getAllUsers Error:', err.message || err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

/**
 * Toggle user block status
 */
const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user, error: findError } = await supabase.from('users').select('status').eq('id', id).single();
    
    if (findError || !user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    
    const { error: updateError } = await supabase.from('users').update({ status: newStatus }).eq('id', id);
    if (updateError) throw updateError;

    return res.status(200).json({ success: true, message: `User account has been ${newStatus}.`, status: newStatus });
  } catch (err) {
    console.error('toggleBlockUser Error:', err.message || err);
    return res.status(500).json({ success: false, message: 'Block toggle error.' });
  }
};

module.exports = { getPendingSellers, approveSeller, getAllUsers, toggleBlockUser };
