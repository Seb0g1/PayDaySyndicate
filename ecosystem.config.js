module.exports = {
  apps: [{
    name: 'salary-manager',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/salary-manager',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/salary-manager-error.log',
    out_file: '/var/log/pm2/salary-manager-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    instances: 1,
    exec_mode: 'fork'
  }]
};

