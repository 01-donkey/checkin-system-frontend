export class RosterManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.globalRoster = [];
    this.globalAbsent = [];
    this.bindElements();
    this.bindEvents();

    // 預設日期為今天
    this.rosterDate.value = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  }

  // 🌟【修正 1】：移除 function 關鍵字，變成類別方法
  escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  bindElements() {
    this.rosterDate = document.getElementById('roster-date');
    this.rosterInput = document.getElementById('roster-input');
    this.uploadBtn = document.getElementById('upload-roster-btn');
    this.clearBtn = document.getElementById('clear-roster-btn');
    this.refreshBtn = document.getElementById('refresh-roster-btn');
    this.search = document.getElementById('roster-search');
    this.dateDisplay = document.getElementById('roster-date-display');
    this.rosterUl = document.getElementById('roster-list-ul');
    this.absentUl = document.getElementById('absent-list-ul');
    this.rosterCount = document.getElementById('roster-count');
    this.absentCount = document.getElementById('absent-count');
    // 🌟【新增】出缺席與確認功能元素
    this.confirmBtn = document.getElementById('confirm-roster-btn');
    this.attendanceStart = document.getElementById('attendance-start');
    this.attendanceEnd = document.getElementById('attendance-end');
    this.exportAttendanceBtn = document.getElementById('export-attendance-btn');
  }

  bindEvents() {
    this.uploadBtn.addEventListener('click', () => this.submitRoster(false));
    this.clearBtn.addEventListener('click', () => this.submitRoster(true));
    this.rosterDate.addEventListener('change', () => this.loadRosterList());
    this.refreshBtn.addEventListener('click', () => this.loadRosterList());
    this.search.addEventListener('input', () => this.renderRosterLists());
    this.confirmBtn.addEventListener('click',  () => this.confirmRoster());          // ← 新增
    this.exportAttendanceBtn.addEventListener('click', () => this.exportAttendance());
  }

  async submitRoster(isClear = false) {
    const btn = isClear ? this.clearBtn : this.uploadBtn;
    const originalText = btn.textContent;
    const targetDate = this.rosterDate.value;
    const rawText = this.rosterInput.value.trim();
    
    if (!targetDate) return alert('請選擇生效日期！');
    
    let rosterData = [];
    if (!isClear) {
      if (!rawText) return alert('請貼上人員名單！');
      const lines = rawText.split('\n');
      for (let line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;
        const match = cleanLine.match(/(\d{4})$/);
        if (match) {
          const phone = match[1];
          const name = cleanLine.slice(0, -4).trim();
          if (name && phone) {
            rosterData.push({ name, phone_last4: phone });
          }
        }
      }
      if (rosterData.length === 0) return alert('解析失敗，請確認格式是否為「姓名 四碼」');
    }

    btn.textContent = '⏳ 處理中...';
    try {
      const data = await this.api.post('/api/roster', { targetDate, rosterData });
      if (data.success) {
        alert(isClear ? '✅ 當日班表已清空，系統切換為自由打卡模式！' : `✅ 成功鎖定！已上傳 ${rosterData.length} 筆排班。`);
        if (!isClear) this.rosterInput.value = ''; 
        this.loadRosterList();
      } else {
        alert('上傳失敗：' + data.message);
      }
    } catch (e) {
      alert('伺服器連線異常');
    } finally {
      btn.textContent = originalText;
    }
  }

  async loadRosterList() {
    const targetDate = this.rosterDate.value;
    if(!targetDate) return;
    
    const originalText = this.refreshBtn.innerHTML;
    this.refreshBtn.innerHTML = '⏳ 載入中...';
    this.refreshBtn.disabled = true;
    this.refreshBtn.classList.add('opacity-50', 'cursor-not-allowed');
    this.dateDisplay.textContent = targetDate;

    try {
      const data = await this.api.post('/api/roster/list', { targetDate });
      if (data.success) {
        this.globalRoster = data.roster || [];
        this.globalAbsent = data.absent || [];
        this.renderRosterLists();
      } else {
        this.rosterUl.innerHTML = `<li class="text-red-400 list-none">${data.message || '拒絕訪問'}</li>`;
        this.absentUl.innerHTML = `<li class="text-red-400 list-none">${data.message || '拒絕訪問'}</li>`;
      }
    } catch (e) {
      this.rosterUl.innerHTML = '<li class="text-red-400 list-none">載入失敗</li>';
      this.absentUl.innerHTML = '<li class="text-red-400 list-none">載入失敗</li>';
    } finally {
      this.refreshBtn.innerHTML = originalText;
      this.refreshBtn.disabled = false;
      this.refreshBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  renderRosterLists() {
    const query = this.search.value.toLowerCase().trim();
    
    const filteredRoster = this.globalRoster.filter(r => 
      (r.name && r.name.toLowerCase().includes(query)) || 
      (r.phone_last4 && r.phone_last4.includes(query))
    );
    const filteredAbsent = this.globalAbsent.filter(r => 
      (r.name && r.name.toLowerCase().includes(query)) || 
      (r.phone_last4 && r.phone_last4.includes(query))
    );

    this.rosterCount.textContent = filteredRoster.length;
    this.absentCount.textContent = filteredAbsent.length;

    if (filteredRoster.length > 0) {
      // 🌟【修正 2】：加上 this.escHtml
      this.rosterUl.innerHTML = filteredRoster.map(r => `<li>${this.escHtml(r.name)} <span class="text-gray-400 text-xs">(${r.phone_last4})</span></li>`).join('');
    } else {
      this.rosterUl.innerHTML = '<li class="text-gray-400 italic list-none">查無相符名單</li>';
    }
    
    if (filteredAbsent.length > 0) {
      // 🌟【修正 2】：加上 this.escHtml
      this.absentUl.innerHTML = filteredAbsent.map(r => `<li class="font-bold text-red-600">${this.escHtml(r.name)} <span class="text-red-400 text-xs font-normal">(${r.phone_last4})</span></li>`).join('');
    } else if (this.globalRoster.length > 0 && query === '') {
      this.absentUl.innerHTML = '<li class="text-green-600 font-bold list-none">🎉 全員到齊！</li>';
    } else {
      this.absentUl.innerHTML = '<li class="text-gray-400 italic list-none">查無相符名單</li>';
    }
  }

  // 確認班表：將今日暫存白名單送入資料庫
async confirmRoster() {
  const targetDate = this.rosterDate.value;
  if (!targetDate) return alert('請先選擇日期！');

  const rosterCount = this.globalRoster.length;
  if (rosterCount === 0) {
    return alert('目前暫存白名單為空，請先上傳班表再確認！');
  }

  const confirmed = confirm(
    `確認要將 ${targetDate} 的 ${rosterCount} 筆排班存入資料庫嗎？\n\n（之後可以用來計算出缺席率，此操作可重複執行以覆蓋）`
  );
  if (!confirmed) return;

  const originalText = this.confirmBtn.textContent;
  this.confirmBtn.textContent = '⏳ 存入中...';
  this.confirmBtn.disabled = true;

  try {
    const data = await this.api.post('/api/roster/confirm', { targetDate });
    if (data.success) {
      alert(data.message);
      // 按鈕短暫顯示成功狀態
      this.confirmBtn.textContent = '✅ 已確認存入';
      setTimeout(() => {
        this.confirmBtn.textContent = originalText;
        this.confirmBtn.disabled = false;
      }, 3000);
    } else {
      alert('存入失敗：' + data.message);
      this.confirmBtn.textContent = originalText;
      this.confirmBtn.disabled = false;
    }
  } catch (e) {
    alert('伺服器連線異常');
    this.confirmBtn.textContent = originalText;
    this.confirmBtn.disabled = false;
  }
}

async exportAttendance() {
  const startDate = this.attendanceStart.value;
  const endDate   = this.attendanceEnd.value;

  if (!startDate || !endDate) return alert('請選擇完整的起訖日期！');
  if (new Date(startDate) > new Date(endDate)) return alert('結束日期不能早於開始日期！');

  const originalText = this.exportAttendanceBtn.textContent;
  this.exportAttendanceBtn.textContent = '⏳ 產生中...';
  this.exportAttendanceBtn.disabled = true;

  try {
    // ✅ 直接用 ApiClient 的方法，自動帶 JWT Header
    const blob = await this.api.exportCsv('/api/attendance/export', { startDate, endDate });
    
    const url = window.URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `出缺席率_${startDate}至${endDate}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    this.exportAttendanceBtn.textContent = '✅ 下載成功';
  } catch (e) {
    alert('匯出失敗，請確認日期範圍內有確認過的排班紀錄');
  } finally {
    setTimeout(() => {
      this.exportAttendanceBtn.textContent = originalText;
      this.exportAttendanceBtn.disabled = false;
    }, 3000);
  }
}

}