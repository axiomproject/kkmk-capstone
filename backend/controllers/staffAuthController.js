const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const staffLogin = async (req, res) => {
  const { email, password } = req.body;
  console.log('Attempting staff login for:', email);

  try {
    const query = 'SELECT * FROM staff_users WHERE email = $1';
    const staff = await db.oneOrNone(query, [email]);

    if (!staff) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check staff status before allowing login
    if (staff.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Account suspended. Please contact administrator.' 
      });
    }

    if (staff.status === 'inactive') {
      return res.status(403).json({ 
        error: 'Account inactive. Please contact administrator to reactivate your account.' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, staff.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Only proceed with login if status is active
    const token = jwt.sign(
      { 
        userId: staff.id, 
        role: 'staff',
        email: staff.email,
        status: staff.status
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Update last login
    await db.none('UPDATE staff_users SET last_login = NOW() WHERE id = $1', [staff.id]);

    res.json({
      token,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: 'staff',
        department: staff.department,
        status: staff.status
      }
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ 
      error: 'Login failed', 
      details: error.message 
    });
  }
};

module.exports = { staffLogin };
