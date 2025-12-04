const { all, run, get } = require('../lib/conn');
const { spawn } = require('child_process');
const path = require('path');

// Fungsi untuk normalisasi nomor telepon ke format internasional (Indonesia)
function normalizePhone(phone) {
  // Hapus spasi, dash, dll
  phone = phone.replace(/[\s\-\(\)]/g, '');
  if (phone.startsWith('0')) {
    return '62' + phone.slice(1);
  }
  if (phone.startsWith('+62')) {
    return phone.slice(1);
  }
  return phone;
}

// Fungsi untuk mengirim pesan WhatsApp
function sendWhatsAppMessage(phone, message) {
  return new Promise((resolve, reject) => {
    const child = spawn('./scripts/whatsmeow/whatsapp', ['-send', `-phone=${phone}`, `-message=${message}`], {
      cwd: path.join(__dirname, '..'),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && stdout.includes('Message sent!')) {
        resolve();
      } else {
        reject(new Error(`Failed to send message: ${stderr || stdout}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Timeout: WhatsApp send process took too long'));
    }, 30000);
  });
}

// Fungsi utama
async function sendReminders() {
  try {
    // Hitung tanggal 3 hari dari sekarang
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(today.getDate() + 3);
    const reminderDateStr = reminderDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Query lisensi yang habis dalam 3 hari dan belum dikirim pengingat
    const licenses = all(`
      SELECT l.lisensi_id, l.tanggal_habis, p.nama_pelanggan, p.telepon_pelanggan, u.nama_user, u.telepon_user, a.nama_app
      FROM Lisensi l
      JOIN Pelanggan p ON l.pelanggan_id = p.pelanggan_id
      JOIN Aplikasi a ON l.app_id = a.app_id
      JOIN Users u ON l.user_id = u.user_id
      WHERE l.tanggal_habis = ? AND l.pengingat_terkirim = 0 AND l.status_lisensi = 'Aktif'
    `, [reminderDateStr]);

    console.log(`Found ${licenses.length} licenses expiring on ${reminderDateStr}`);

    for (const license of licenses) {
      const normalizedCustomerPhone = normalizePhone(license.telepon_pelanggan);
      const message = `Halo ${license.nama_user},\n\nLisensi aplikasi "${license.nama_app}" untuk pelanggan "${license.nama_pelanggan}" akan habis pada ${license.tanggal_habis}.\nKontak pelanggan: ${normalizedCustomerPhone || 'Tidak tersedia'}\nSilakan ikuti upaya perpanjangan.\n\nTerima kasih.`;

      try {
        const normalizedPhone = normalizePhone(license.telepon_user);
        await sendWhatsAppMessage(normalizedPhone, message);
        console.log(`Reminder sent to ${license.nama_user} (${normalizedPhone}) for customer ${license.nama_pelanggan}`);

        // Update pengingat_terkirim
        run('UPDATE Lisensi SET pengingat_terkirim = 1 WHERE lisensi_id = ?', [license.lisensi_id]);
      } catch (error) {
        console.error(`Failed to send reminder to ${license.nama_user} (${normalizePhone(license.telepon_user)}):`, error.message);
      }
    }

    console.log('Reminder process completed.');
  } catch (error) {
    console.error('Error in sendReminders:', error);
  }
}

// Jalankan jika dipanggil langsung
if (require.main === module) {
  sendReminders();
}

module.exports = { sendReminders };