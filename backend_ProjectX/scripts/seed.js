const bcrypt = require('bcrypt');
const { supabase } = require('../config/supabase');

const seed = async () => {
  try {
    const hashedPassword = await bcrypt.hash('jarvis@1234', 10);
    
    const { data: existing } = await supabase.from('users').select('id').eq('email', 'dhairyashilshinde6715@gmail.com').maybeSingle();
    
    if (!existing) {
      const { error } = await supabase.from('users').insert({
        email: 'dhairyashilshinde6715@gmail.com',
        password: hashedPassword,
        name: 'Dhairyashil Shinde',
        role: 'super_admin',
        status: 'active'
      });
      if (error) throw error;
      console.log('👑 Super Admin created: dhairyashilshinde6715@gmail.com');
    } else {
      // Always re-hash password to keep it correct
      const { error } = await supabase.from('users').update({
        password: hashedPassword,
        role: 'super_admin',
        status: 'active'
      }).eq('email', 'dhairyashilshinde6715@gmail.com');
      if (error) throw error;
      console.log('✅ Super Admin already exists — password re-synced.');
    }
  } catch (err) {
    console.error('Seed error:', err.message || err);
  } finally {
    process.exit();
  }
};

seed();
