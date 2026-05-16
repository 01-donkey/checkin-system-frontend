export class SystemManager {
  constructor(apiClient, onLoginSuccess) {
    this.api = apiClient;
    this.onLoginSuccess = onLoginSuccess; // 登入成功後觸發其他模組載入資料的 Callback
    this.initFlatpickr(); // 🌟 啟動！在這裡呼叫時間選擇器的初始化
    this.bindElements();
    this.bindEvents();
  }

  bindElements() {
    this.loginBtn = document.getElementById('login-btn');
    this.pwdInput = document.getElementById('admin-pwd');
    this.errorMsg = document.getElementById('login-error');
    this.loginSection = document.getElementById('login-section');
    this.dashboardSection = document.getElementById('dashboard-section');
    this.openTime = document.getElementById('open-time');
    this.closeTime = document.getElementById('close-time');
    this.saveTimeBtn = document.getElementById('save-time-btn');
    this.statusBadge = document.getElementById('current-status-badge');
    this.openDisplayBtn = document.getElementById('open-display-btn');
    this.settingsCard = document.getElementById('settings-card');
  }

  // 🌟 新增這個專屬方法來綁定時間選擇器套件
  initFlatpickr() {
    // 透過 window.flatpickr 確保能抓到 CDN 載入的全域變數
    if (typeof window.flatpickr !== 'undefined') {
      window.flatpickr(".time-picker", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        minuteIncrement: 15
      });
    } else {
      console.error('🚨 Flatpickr 尚未載入，請確認網路連線或 CDN 網址');
    }
  }

  bindEvents() {
    this.loginBtn.addEventListener('click', () => this.handleLogin());
    this.saveTimeBtn.addEventListener('click', () => this.saveSettings());
    this.openDisplayBtn.addEventListener('click', () => this.openKioskDisplay());
  }

  updateStatusBadge(openTime, closeTime) {
    // 🌟 優化 1：改用 en-GB 語系，這是全世界唯一能保證跨瀏覽器絕對產出 "09:00" (雙位數 24H 制) 的語系設定
    const tpeTime = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' });
    
    if (tpeTime >= openTime && tpeTime <= closeTime) {
      this.statusBadge.textContent = '🟢 營業中 (系統開放打卡)';
      this.statusBadge.className = 'px-3 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 transition-colors';
    } else {
      this.statusBadge.textContent = '🔴 休息中 (系統關閉打卡)';
      this.statusBadge.className = 'px-3 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 transition-colors';
    }
  }

  async handleLogin() {
    this.loginBtn.textContent = '驗證中...';
    const pwd = this.pwdInput.value;
    
    try {
      this.api.setPassword(pwd); 
      const data = await this.api.post('/api/settings');
      
      if (data.success) {
        this.loginSection.classList.add('hidden');
        this.dashboardSection.classList.remove('hidden');
        this.dashboardSection.classList.add('flex');
        
        // 🌟 優化 2：確保 Flatpickr 的內部狀態與畫面同步更新
        if (this.openTime._flatpickr) {
          this.openTime._flatpickr.setDate(data.open_time);
          this.closeTime._flatpickr.setDate(data.close_time);
        } else {
          // 如果某天拿掉套件，還是能兼容原生 input
          this.openTime.value = data.open_time;
          this.closeTime.value = data.close_time;
        }

        this.updateStatusBadge(data.open_time, data.close_time);
        this.onLoginSuccess(); 
      } else {
        this.errorMsg.textContent = data.message || '密碼錯誤，請重試。'; 
        this.errorMsg.classList.remove('hidden');
        this.loginBtn.textContent = '登入系統';
      }
    } catch (e) { 
      this.errorMsg.textContent = '伺服器連線失敗 (可能已當機)';
      this.errorMsg.classList.remove('hidden'); 
      this.loginBtn.textContent = '登入系統';
    }
  }

  async saveSettings() {
    this.saveTimeBtn.textContent = '🔄 儲存中...';
    this.saveTimeBtn.classList.add('opacity-75', 'cursor-not-allowed');
    const newOpen = this.openTime.value;
    const newClose = this.closeTime.value;

    try {
      const data = await this.api.put('/api/settings', { open_time: newOpen, close_time: newClose });
      if (data.success) {
        this.saveTimeBtn.textContent = '✅ 設定已生效！';
        this.saveTimeBtn.classList.replace('bg-green-600', 'bg-blue-600');
        this.saveTimeBtn.classList.replace('hover:bg-green-700', 'hover:bg-blue-700');
        this.settingsCard.classList.add('ring-4', 'ring-blue-100');
        this.updateStatusBadge(newOpen, newClose);

        setTimeout(() => {
          this.saveTimeBtn.textContent = '儲存時間設定';
          this.saveTimeBtn.classList.replace('bg-blue-600', 'bg-green-600');
          this.saveTimeBtn.classList.replace('hover:bg-blue-700', 'hover:bg-green-700');
          this.saveTimeBtn.classList.remove('opacity-75', 'cursor-not-allowed');
          this.settingsCard.classList.remove('ring-4', 'ring-blue-100');
        }, 3000);
      }
    } catch (e) {
      this.saveTimeBtn.textContent = '❌ 儲存失敗';
    }
  }

  openKioskDisplay() {
    const safePassword = this.api.password;
    if (!safePassword) return alert('請先輸入管理員密碼再開啟機台！');
    localStorage.setItem('temp_kiosk_key', safePassword);
    window.open('/display', '_blank'); 
  }
}