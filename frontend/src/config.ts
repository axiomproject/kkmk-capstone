const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? '/api' // Will be served from same domain in production
    : 'http://localhost:5175'
};

export default config;
