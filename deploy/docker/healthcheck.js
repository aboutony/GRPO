/**
 * GRPO Health Check — used by Docker HEALTHCHECK and monitoring
 */
const http = require('http');
const port = process.env.GRPO_PORT || 8443;

const req = http.request(
    { hostname: '127.0.0.1', port, path: '/health', timeout: 4000 },
    (res) => {
        if (res.statusCode === 200) process.exit(0);
        else process.exit(1);
    }
);
req.on('error', () => process.exit(1));
req.on('timeout', () => { req.destroy(); process.exit(1); });
req.end();
