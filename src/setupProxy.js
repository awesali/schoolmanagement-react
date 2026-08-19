const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://localhost:7015',
      changeOrigin: true,
      secure: false, // allow self-signed certificate
    })
  );
};
