const { supabase } = require('../config/supabase');

/**
 * Get all products joining the seller business name
 */
const getProducts = async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        users!inner (
          seller_profiles ( business_name, upi_id )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getProducts DB Error:', error);
      throw error;
    }

    // Map to flatten the storeName cleanly for the frontend
    const mappedProducts = products.map(p => ({
      ...p,
      originalPrice: p.original_price, // map snake_case back to camelCase for UI
      storeName: p.users?.seller_profiles?.[0]?.business_name || 'QuickBite Store',
      upiId: p.users?.seller_profiles?.[0]?.upi_id || ''
    }));

    return res.status(200).json({ success: true, products: mappedProducts });
  } catch (err) {
    console.error('getProducts Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
};

/**
 * Add a new product (Admin Only)
 */
const addProduct = async (req, res) => {
  try {
    const seller_id = req.user.id; // from JWT token middleware
    const payload = req.body;

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        seller_id,
        name: payload.name,
        description: payload.description,
        category: payload.category || 'Burgers',
        cuisine: payload.cuisine || 'Global',
        image: payload.image || '',
        dietary: payload.dietary || 'Veg',
        price: payload.price,
        original_price: payload.originalPrice,
        mrp: payload.mrp,
        discount: payload.discount || 0,
        stock: payload.stock || 0,
        time: payload.time || '20-30 min',
        tags: payload.tags || [],
        status: payload.status || 'Active'
      })
      .select(`
        *,
        users!inner (
          seller_profiles ( business_name, upi_id )
        )
      `)
      .single();

    if (error) throw error;
    
    const storeName = newProduct.users?.seller_profiles?.[0]?.business_name || 'QuickBite Store';
    const upiId = newProduct.users?.seller_profiles?.[0]?.upi_id || '';

    return res.status(201).json({ 
      success: true, 
      product: { ...newProduct, originalPrice: newProduct.original_price, storeName, upiId } 
    });
  } catch (err) {
    console.error('addProduct Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to add product.' });
  }
};

/**
 * Update a product (Admin Only)
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    
    // In strict env, check req.user.id === product.seller_id
    // Here we'll just allow any admin for prototype simplicity.

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update({
        name: payload.name,
        description: payload.description,
        category: payload.category,
        cuisine: payload.cuisine,
        image: payload.image,
        dietary: payload.dietary,
        price: payload.price,
        original_price: payload.originalPrice,
        mrp: payload.mrp,
        discount: payload.discount,
        stock: payload.stock,
        time: payload.time,
        tags: payload.tags,
        status: payload.status
      })
      .eq('id', id)
      .select(`
        *,
        users!inner (
          seller_profiles ( business_name, upi_id )
        )
      `)
      .single();

    if (error) throw error;

    const storeName = updatedProduct.users?.seller_profiles?.[0]?.business_name || 'QuickBite Store';
    const upiId = updatedProduct.users?.seller_profiles?.[0]?.upi_id || '';

    return res.status(200).json({ 
      success: true, 
      product: { ...updatedProduct, originalPrice: updatedProduct.original_price, storeName, upiId } 
    });
  } catch (err) {
    console.error('updateProduct Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
};

/**
 * Get Recommendations (AI Logic)
 */
const getRecommendations = async (req, res) => {
  try {
    const { viewed = [], cart = [], purchased = [] } = req.body;
    
    const { data: products, error } = await supabase
      .from('products')
      .select(`*, users!inner ( seller_profiles ( business_name, upi_id ) )`)
      .eq('status', 'Active');
      
    if (error) throw error;
    
    const mappedProducts = products.map(p => ({
      ...p,
      originalPrice: p.original_price,
      storeName: p.users?.seller_profiles?.[0]?.business_name || 'QuickBite Store',
      upiId: p.users?.seller_profiles?.[0]?.upi_id || ''
    }));

    let activeCategories = new Set();
    
    [...viewed, ...cart].forEach(id => {
      const p = mappedProducts.find(x => x.id === id);
      if (p) activeCategories.add(p.category);
    });

    [...purchased, ...cart].forEach(id => {
      const p = mappedProducts.find(x => x.id === id);
      if (p) {
        if (['Burgers', 'Pizza'].includes(p.category)) {
          activeCategories.add('Drinks');
          activeCategories.add('Desserts');
        }
        if (['Chinese', 'Indian', 'Sushi'].includes(p.category)) {
          activeCategories.add('Desserts');
        }
      }
    });

    let recommended = mappedProducts.filter(p => activeCategories.has(p.category) && !purchased.includes(p.id));

    if (recommended.length === 0) {
      recommended = mappedProducts.sort(() => 0.5 - Math.random()).slice(0, 8);
    } else {
      recommended = recommended.sort(() => 0.5 - Math.random()).slice(0, 8);
    }
    
    return res.status(200).json({ success: true, recommendations: recommended });

  } catch (err) {
    console.error('getRecommendations Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to fetch recommendations.' });
  }
};

module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  getRecommendations
};
