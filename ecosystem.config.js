module.exports = {
  apps: [
    {
      name: 'app-sale-internal',
      script: 'npm',
      args: 'start',

      // Restart otomatis jika aplikasi crash
      autorestart: true,

      // Jangan pantau perubahan file
      watch: false,

      // --- RESTART OTOMATIS SETIAP HARI PUKUL 10:00 ---
      // Pola cron '0 10 * * *' berarti "jalankan pada menit ke-0, jam ke-10 setiap hari".
      cron_restart: '0 10 * * *',
    }
  ]
};