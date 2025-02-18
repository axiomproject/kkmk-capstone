const pgp = require('pg-promise')();

const config = {
  user: process.env.DB_USER || 'kkmk_db',
  host: process.env.DB_HOST || 'dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com',
  database: process.env.DB_NAME || 'kkmk',
  password: process.env.DB_PASSWORD || 'c3dv1H1UcmugVinLWsxd1J4ozszIyK3C',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: {
    rejectUnauthorized: false
  }
};

const db = pgp(config);

// Add error handling
db.connect()
  .then(obj => {
    console.log('Database connection successful');
    obj.done();
  })
  .catch(error => {
    console.error('Database connection error:', error);
    process.exit(1); // Exit if we can't connect to the database
  });

module.exports = db;
