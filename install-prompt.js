// Prompt untuk install PWA
let deferredPrompt;
const installButton = document.createElement('button');

// Buat tombol install
function createInstallButton() {
  installButton.innerHTML = '📲 Install App';
  installButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #a855f7, #7c3aed);
    color: white;
    border: none;
    border-radius: 25px;
    font-weight: bold;
    font-size: 16px;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(168,85,247,0.4);
    display: none;
  `;
  
  installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      deferredPrompt = null;
      hideInstallButton();
    }
  });
  
  document.body.appendChild(installButton);
}

// Tampilkan tombol install
function showInstallButton() {
  installButton.style.display = 'block';
  installButton.style.animation = 'fadeIn 0.3s';
}

// Sembunyikan tombol install
function hideInstallButton() {
  installButton.style.display = 'none';
}

// Event sebelum install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Tampilkan tombol install setelah 5 detik
  setTimeout(() => {
    if (deferredPrompt) {
      showInstallButton();
    }
  }, 5000);
});

// Event setelah diinstall
window.addEventListener('appinstalled', () => {
  console.log('PWA installed successfully!');
  hideInstallButton();
  
  // Tampilkan pesan sukses
  showMessage('✅ Aplikasi berhasil diinstall!', 3000);
});

// Cek apakah sudah diinstall
if (window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone === true) {
  console.log('Running in standalone mode');
}

// Inisialisasi tombol install
createInstallButton();
