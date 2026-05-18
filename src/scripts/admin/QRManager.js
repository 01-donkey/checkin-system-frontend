// scripts/admin/QRManager.js
export class QRManager {
  constructor(apiClient) {
    this.api = apiClient; // 🌟 接收帶有 JWT 功能的 API 客戶端
    this.locationSelect = document.getElementById('temp-qr-location');
    this.actionSelect = document.getElementById('temp-qr-action');
    this.durationSelect = document.getElementById('temp-qr-duration');
    this.generateBtn = document.getElementById('generate-temp-qr-btn');
    this.canvas = document.getElementById('temp-qr-canvas');
    this.linkBox = document.getElementById('temp-qr-link-box');
    this.linkInput = document.getElementById('temp-qr-link');
    this.countdownText = document.getElementById('temp-qr-countdown');
    this.placeholder = document.getElementById('temp-qr-placeholder');
    this.countdownInterval = null;

    this.initEventListeners();
  }

  async loadLocations() {
    try {
      const data = await this.api.get('/api/locations');
      if (data.success) {
        this.locationSelect.innerHTML = '';
        data.locations.forEach(loc => {
          const option = document.createElement('option');
          option.value = loc.id;
          option.textContent = loc.location_name;
          this.locationSelect.appendChild(option);
        });
      }
    } catch (e) {
      console.error('載入場地失敗:', e);
    }
  }

  initEventListeners() {
    if (!this.generateBtn) return;
    this.generateBtn.addEventListener('click', () => this.generateQR());
  }

  async generateQR() {
    const location_id = this.locationSelect.value;
    const action = this.actionSelect.value;
    const duration = this.durationSelect.value;

    if (!location_id) return alert('請先選擇場地');

    this.generateBtn.textContent = '⏳ 生成中...';
    this.generateBtn.disabled = true;

    try {
      // 🌟 核心修復：直接呼叫 this.api.post，它會自動把您的 JWT 夾帶在 Header 裡面送給後端！
      const data = await this.api.post('/api/qr-token', {
        location_id: parseInt(location_id),
        duration: parseInt(duration)
      });

      if (data.success) {
        import('qrcode').then(QRCode => {
          const baseUrl = window.location.origin;
          const checkinUrl = `${baseUrl}/?loc=${data.location_id}&action=${action}&token=${data.token}`;
          
          QRCode.default.toCanvas(this.canvas, checkinUrl, { width: 200, margin: 2 });
          
          this.canvas.classList.remove('hidden');
          this.linkBox.classList.remove('hidden');
          this.countdownText.classList.remove('hidden');
          this.placeholder.classList.add('hidden');
          
          this.linkInput.value = checkinUrl;
          this.startCountdown(parseInt(duration));
        });
      } else {
        alert(data.message || '生成失敗');
      }
    } catch (e) {
      alert('連線失敗，請檢查網路狀態');
    } finally {
      this.generateBtn.textContent = '⚡ 立即生成專屬條碼';
      this.generateBtn.disabled = false;
    }
  }

  startCountdown(durationMs) {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    
    const endTime = Date.now() + durationMs;
    
    const update = () => {
      const remain = endTime - Date.now();
      if (remain <= 0) {
        this.countdownText.textContent = '⚠️ 此條碼已過期';
        this.countdownText.classList.replace('text-red-500', 'text-gray-500');
        clearInterval(this.countdownInterval);
        return;
      }
      
      const hrs = Math.floor(remain / 3600000);
      const mins = Math.floor((remain % 3600000) / 60000);
      const secs = Math.floor((remain % 60000) / 1000);
      
      let timeStr = '';
      if (hrs > 0) timeStr += `${hrs}小時 `;
      timeStr += `${mins}分 ${secs}秒`;
      
      this.countdownText.textContent = `⏳ 距離過期還有：${timeStr}`;
      this.countdownText.classList.replace('text-gray-500', 'text-red-500');
    };
    
    update();
    this.countdownInterval = setInterval(update, 1000);
  }
}