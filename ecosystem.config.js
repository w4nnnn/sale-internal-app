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

      // --- RESTART OTOMATIS SETIAP 12 JAM ---
      // Pola cron '0 */12 * * *' berarti "jalankan pada menit ke-0, setiap 12 jam".
      // Ini akan merestart aplikasi pada pukul 00:00 (tengah malam) dan 12:00 (siang).
      cron_restart: '0 */24 * * *',
    }
  ]
};