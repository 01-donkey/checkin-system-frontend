import QRCode from 'qrcode';

export class QRManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.tempQrInterval = null;
    this.bindElements();
    this.bindEvents();
  }

  bindElements() {
    this.locationSelect = document.getElementById('temp-qr-location');
    this.actionSelect = document.getElementById('temp-qr-action');
    this.durationSelect = document.getElementById('temp-qr-duration');
    this.generateBtn = document.getElementById('generate-temp-qr-btn');
    this.canvas = document.getElementById('temp-qr-canvas');
    this.linkBox = document.getElementById('temp-qr-link-box');
    this.linkInput = document.getElementById('temp-qr-link');
    this.countdownText = document.getElementById('temp-qr-countdown');
    this.placeholder = document.getElementById('temp-qr-placeholder');
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generateQR());
  }

  async loadLocations() {
    try {
      const data = await this.api.get('/api/locations');
      if (data.success) {
        this.locationSelect.innerHTML = data.locations.map(loc => `<option value="${loc.id}">${loc.location_name}</option>`).join('');
      }
    } catch(e) {
      console.error('Failed to load locations', e);
    }
  }

  async generateQR() {
    const locId = this.locationSelect.value;
    const action = this.actionSelect.value;
    const duration = this.durationSelect.value;
    
    if (!locId) return alert('請先等待場地載入');

    try {
      const data = await this.api.post('/api/qr-token', { location_id: locId, duration });
      if (data.success) {
        const baseUrl = window.location.origin;
        const checkinUrl = `${baseUrl}/?loc=${data.location_id}&action=${action}&token=${data.token}`;
        
        QRCode.toCanvas(this.canvas, checkinUrl, { width: 220, margin: 2 });
        
        this.canvas.classList.remove('hidden');
        this.linkBox.classList.remove('hidden');
        this.countdownText.classList.remove('hidden');
        this.placeholder.classList.add('hidden');
        
        this.linkInput.value = checkinUrl;
        this.linkInput.onclick = () => {
          this.linkInput.select();
          navigator.clipboard.writeText(this.linkInput.value);
          alert('網址已複製！可以貼到 LINE 群組了！');
        };
        
        this.startCountdown(parseInt(duration));
      }
    } catch(e) {
      alert('條碼生成失敗，請確認伺服器連線');
    }
  }

  startCountdown(durationMs) {
    const expireTime = Date.now() + durationMs;
    if (this.tempQrInterval) clearInterval(this.tempQrInterval);
    
    this.tempQrInterval = setInterval(() => {
      const remain = Math.floor((expireTime - Date.now()) / 1000);
      if (remain <= 0) {
        this.countdownText.textContent = '🛑 此條碼已過期！';
        clearInterval(this.tempQrInterval);
      } else {
        const h = Math.floor(remain / 3600);
        const m = Math.floor((remain % 3600) / 60);
        const s = remain % 60;
        let timeStr = h > 0 ? `${h}小時 ${m}分 ${s}秒` : `${m}分 ${s}秒`;
        this.countdownText.textContent = `⏳ 距離條碼失效：${timeStr}`;
      }
    }, 1000);
  }
}