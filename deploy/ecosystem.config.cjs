module.exports = {
  apps: [
    {
      name: 'counter-stryke',
      cwd: './server',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        TRUST_PROXY: '1',
        CORS_ORIGIN: '*',
      },
    },
  ],
};
