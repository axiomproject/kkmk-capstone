CREATE TABLE scholars (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  grade_level VARCHAR(50) NOT NULL,
  school VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  guardian_name VARCHAR(255),
  guardian_phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
