module.exports = {
  apps: [
    {
      name: 'volume-spike-bot',
      script: './backend/server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      // Restart delay on crash
      restart_delay: 5000,
      // Keep logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
    },
  ],
};
