module.exports = {
  apps: [
    {
      name: "efootball-bot",
      script: "index.js",
      watch: false, // keep false: whatsapp-web.js writes session files constantly, watch would cause restart loops
      max_memory_restart: "500M",
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
