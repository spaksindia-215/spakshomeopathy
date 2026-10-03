module.exports = {
  apps: [
    {
      name: 'spakshomeopathy',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1, // Set to 'max' if you have 4GB+ RAM and multiple CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
