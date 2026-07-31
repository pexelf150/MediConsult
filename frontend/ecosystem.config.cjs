module.exports = {
  apps: [
    {
      name: 'mediconsult-frontend',
      script: 'dist/server/server.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        VITE_BACKEND_URL: 'http://localhost:5001',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        VITE_BACKEND_URL: 'http://localhost:5001',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      max_memory_restart: '1G',
      merge_logs: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
    },
  ],
};
