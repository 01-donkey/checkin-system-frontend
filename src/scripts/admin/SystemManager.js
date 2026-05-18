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
    this.openDisplayBtn.addEventListener('click', () => {
    this.openKioskDisplay().catch(err => {
        console.error('開啟機台失敗:', err);
        alert('無法啟動機台，請確認後端伺服器連線狀態');
        this.openDisplayBtn.textContent = '🖥️ 啟動現場簽到螢幕';
      });
    });
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
      // 🌟 改呼叫新的登入 API，拿密碼換取安全 JWT Token
      const data = await this.api.post('/api/login', { password: pwd });
      
      if (data.success) {
        this.api.setToken(data.token); // 🌟 將 Token 存入連線核心，密碼隨即被記憶體回收釋放
        sessionStorage.setItem('admin_jwt', data.token); // ← 存入 sessionStorage
        this.loginSection.classList.add('hidden');
        this.dashboardSection.classList.remove('hidden');
        this.dashboardSection.classList.add('flex');
        
        // 此時 API 客戶端已攜帶 JWT，可合法下載日常設定資料
        const configData = await this.api.post('/api/settings');
        if (configData.success) {
          if (this.openTime._flatpickr) {
            this.openTime._flatpickr.setDate(configData.open_time);
            this.closeTime._flatpickr.setDate(configData.close_time);
          } else {
            this.openTime.value = configData.open_time;
            this.closeTime.value = configData.close_time;
          }
          this.updateStatusBadge(configData.open_time, configData.close_time);
        }

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

  async openKioskDisplay() {
    this.openDisplayBtn.textContent = '🔄 安全授權中...';
    
    // 取得當前管理員挑選的預設場地（若無則預設為 1）
    const targetLocationId = document.getElementById('temp-qr-location')?.value || 1;

    try {
      // 持管理員 JWT 向後端換取該場地的 12 小時簽到站專用憑證
      const data = await this.api.post('/api/qr-token/kiosk-token', { location_id: targetLocationId });
      
      if (data.success) {
        // 🌟 最佳實踐：直接透過 URL 參數單向傳遞通行證，不留存在後台的瀏覽器中
        const kioskUrl = `/display?kiosk_token=${encodeURIComponent(data.token)}`;
        const newWindow = window.open(kioskUrl, '_blank');
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          alert('⚠️ 彈窗被瀏覽器攔截！請允許此網站開啟彈窗後重試。');
        }
      }
    } catch (e) {
      alert('無法啟動機台，請確認後端伺服器連線狀態');
    } finally {
      this.openDisplayBtn.textContent = '🖥️ 啟動現場簽到螢幕';
    }
  }

}