const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('baileys');
const fs = require('fs');
const path = require('path');
const logger = require('pino')();
const silentLogger = require('pino')({ level: 'silent' });
const qrcode = require('qrcode-terminal');

const authDir = path.join(__dirname, '..', 'auth_info_baileys');

async function connectToWhatsApp(targetNumber, message) {
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
        auth: state,
        logger: silentLogger,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            logger.info('QR Code received');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            logger.info('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp(targetNumber, message);
            }
        } else if (connection === 'open') {
            logger.info('opened connection');

            sock.sendMessage(targetNumber, { text: message }).then(() => {
                logger.info('Pesan terkirim');
                process.exit(0); // Keluar setelah mengirim
            }).catch(err => {
                logger.error('Gagal mengirim pesan:', err);
                process.exit(1);
            });
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

async function checkLoginStatus() {
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
        auth: state,
        logger: silentLogger,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            logger.info('Not logged in - QR Code required');
            process.exit(1);
        }
        if (connection === 'close') {
            logger.info('Not logged in - Connection closed');
            process.exit(1);
        } else if (connection === 'open') {
            logger.info('Logged in successfully');
            process.exit(0);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Timeout jika tidak ada update dalam 10 detik
    setTimeout(() => {
        logger.info('Login check timeout - assuming not logged in');
        process.exit(1);
    }, 10000);
}

async function logout() {
    if (!fs.existsSync(authDir)) {
        logger.info('No auth directory found - already logged out');
        process.exit(0);
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
        auth: state,
        logger: silentLogger,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            logger.info('Connection closed during logout');
        } else if (connection === 'open') {
            logger.info('Logging out...');
            sock.logout().then(() => {
                // Hapus auth directory
                fs.rmSync(authDir, { recursive: true, force: true });
                logger.info('Logged out successfully and auth data cleared');
                process.exit(0);
            }).catch(err => {
                logger.error('Failed to logout:', err);
                process.exit(1);
            });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Timeout jika tidak connect dalam 10 detik
    setTimeout(() => {
        logger.info('Logout timeout - forcing auth data clear');
        fs.rmSync(authDir, { recursive: true, force: true });
        logger.info('Auth data cleared');
        process.exit(0);
    }, 10000);
}

if (process.argv[2] === 'check') {
    checkLoginStatus();
} else if (process.argv[2] === 'logout') {
    logout();
} else if (process.argv[2] === 'send') {
    const targetNumber = process.argv[3];
    const message = process.argv[4] || 'Hello from Baileys!';
    if (!targetNumber) {
        logger.error('Target number required for send command');
        process.exit(1);
    }
    connectToWhatsApp(targetNumber, message);
} else {
    // Default: send to default number
    connectToWhatsApp('628973914602@s.whatsapp.net', 'Hello from Baileys!');
}

module.exports = {
    connectToWhatsApp,
    checkLoginStatus,
    logout,
};