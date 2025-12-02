const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'Store.js');
const destination = path.join(__dirname, '..', 'node_modules', 'whatsapp-web.js', 'src', 'util', 'Injected', 'Store.js');

fs.copyFile(source, destination, (err) => {
  if (err) {
    console.error('Error copying file:', err);
  } else {
    console.log('Store.js berhasil disalin ke node_modules.');
  }
});
