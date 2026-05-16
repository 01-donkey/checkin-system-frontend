export class RecordManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.globalRecordsArray = [];
    this.locationsSet = new Set();
    this.bindElements();
    this.bindEvents();
  }

  bindElements() {
    this.tableBody = document.getElementById('record-table-body');
    this.locationFilter = document.getElementById('location-filter');
    this.recordSearch = document.getElementById('record-search');
    this.statPresent = document.getElementById('stat-present');
    this.statLeft = document.getElementById('stat-left');
    this.refreshBtn = document.getElementById('refresh-btn');
    this.exportRange = document.getElementById('export-range');
    this.customDateWrap = document.getElementById('custom-date-wrap');
    this.exportBtn = document.getElementById('export-btn');
    this.exportStart = document.getElementById('export-start');
    this.exportEnd = document.getElementById('export-end');
  }

  bindEvents() {
    this.refreshBtn.addEventListener('click', () => this.fetchRecords());
    this.locationFilter.addEventListener('change', () => this.renderTable());
    this.recordSearch.addEventListener('input', () => this.renderTable());
    this.exportRange.addEventListener('change', () => this.toggleCustomDateWrap());
    this.exportBtn.addEventListener('click', () => this.exportCsv());
  }

  async fetchRecords() {
    this.tableBody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400 font-medium animate-pulse">🔄 載入資料中...</td></tr>';
    try {
      const data = await this.api.post('/api/records');
      if (data.success && data.records.length > 0) {
        this.processRecords(data.records);
        this.updateLocationFilter();
        this.renderTable();
      } else {
        this.tableBody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">目前尚無任何打卡紀錄</td></tr>';
        this.statPresent.textContent = '0';
        this.statLeft.textContent = '0';
      }
    } catch (e) {
      this.tableBody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-red-400">載入失敗，請稍後再試</td></tr>';
    }
  }

  processRecords(records) {
    const groupedData = {};
    this.locationsSet.clear();

    records.forEach(r => {
      const dateObj = new Date(r.timestamp);
      
      // 顯示在畫面上的日期 (例如 05/16)
      const dateStr = dateObj.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit' });
      
      // 底層比對用的完整日期，改用 en-CA 確保產出絕對標準的 YYYY-MM-DD
      const fullDateStr = dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }); 
      
      // 🌟 終極優化：改用 en-GB 語系，保證跨瀏覽器絕對產出雙位數 24H 制 (例如 09:30)
      const timeStr = dateObj.toLocaleTimeString('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' });
      
      const key = `${r.worker_name}_${fullDateStr}`; 

      this.locationsSet.add(r.location_name);

      if (!groupedData[key]) {
        groupedData[key] = {
          workerId: r.worker_id,
          date: dateStr,
          fullDate: fullDateStr,
          group: r.worker_group || '未分類',
          subGroup: r.sub_group || '無',
          name: r.worker_name,
          location: r.location_name,
          inTime: '<span class="text-gray-300">--:--</span>',
          outTime: '<span class="text-gray-300">--:--</span>',
          hasIn: false,
          hasOut: false,
          bento: '',
          specialStatus: ''
        };
      }

      if (r.action === 'IN' && !groupedData[key].hasIn) {
        groupedData[key].inTime = `<span class="font-bold text-emerald-700">${timeStr}</span>`;
        groupedData[key].hasIn = true;
        if (r.work_log) groupedData[key].bento = r.work_log;
      } else if (r.action === 'OUT') {
        if (r.special_status) groupedData[key].specialStatus = r.special_status;
        groupedData[key].outTime = `<span class="font-bold text-rose-700">${timeStr}</span>`;
        groupedData[key].hasOut = true;
      }
    });

    this.globalRecordsArray = Object.values(groupedData);
  }

  updateLocationFilter() {
    const currentSelected = this.locationFilter.value;
    this.locationFilter.innerHTML = '<option value="ALL">顯示全部場地</option>';
    this.locationsSet.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc;
      opt.textContent = loc;
      this.locationFilter.appendChild(opt);
    });
    if ([...this.locationFilter.options].some(o => o.value === currentSelected)) {
       this.locationFilter.value = currentSelected;
    }
  }

  renderTable() {
    // 今日日期也改用 en-CA，確保與資料庫的 YYYY-MM-DD 完美匹配
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    const selectedLocation = this.locationFilter.value;
    const searchQuery = this.recordSearch.value.toLowerCase().trim();
    
    let presentCount = 0;
    let leftCount = 0;

    const displayRecords = this.globalRecordsArray.filter(g => {
      const isToday = (g.fullDate === todayStr);
      const isMatchLocation = (selectedLocation === 'ALL' || g.location === selectedLocation);
      
      // 確保即使某個欄位是 null 也不會導致 toLowerCase() 報錯當機
      const isMatchSearch = !searchQuery || 
                            (g.name && g.name.toLowerCase().includes(searchQuery)) || 
                            (g.group && g.group.toLowerCase().includes(searchQuery)) ||
                            (g.subGroup && g.subGroup.toLowerCase().includes(searchQuery));
      return isToday && isMatchLocation && isMatchSearch;
    });

    displayRecords.forEach(g => {
      if (g.hasIn && !g.hasOut) presentCount++;
      if (g.hasOut) leftCount++;
    });

    this.statPresent.textContent = presentCount;
    this.statLeft.textContent = leftCount;

    if (displayRecords.length > 0) {
      this.tableBody.innerHTML = displayRecords.map(g => `
        <tr class="hover:bg-blue-50 transition-colors">
          <td class="p-3 font-medium text-gray-500">${g.date}</td>
          <td class="p-3"><span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs border border-gray-200">${g.group}</span></td>
          <td class="p-3"><div class="max-w-xs text-sm text-gray-800 font-medium">${g.subGroup || '<span class="text-gray-300 italic font-normal">無</span>'}</div></td>
          <td class="p-3 font-bold text-gray-800 text-base">${g.name}</td>
          <td class="p-3 text-gray-600 text-xs">${g.location}</td>
          <td class="p-3">${g.inTime}</td>
          <td class="p-3">${g.outTime}</td>
          <td class="p-3"><div class="max-w-xs text-sm text-gray-800 font-medium">${g.bento || '<span class="text-gray-300 italic font-normal">未選擇便當</span>'}</div></td>
          <td class="p-3"><div class="max-w-xs text-sm text-gray-800 font-medium">${g.specialStatus || '<span class="text-gray-300 italic font-normal">無</span>'}</div></td>
        </tr>
      `).join('');
    } else {
      this.tableBody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">該場地目前尚無打卡紀錄</td></tr>';
    }
  }

  toggleCustomDateWrap() {
    if (this.exportRange.value === 'CUSTOM') {
      this.customDateWrap.classList.remove('hidden');
      this.customDateWrap.classList.add('flex');
    } else {
      this.customDateWrap.classList.add('hidden');
      this.customDateWrap.classList.remove('flex');
    }
  }

  getTpeDateString(daysOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  }

  async exportCsv() {
    const rangeVal = this.exportRange.value;
    let startDate = '';
    let endDate = '';

    if (rangeVal === 'TODAY') {
      startDate = endDate = this.getTpeDateString(0);
    } else if (rangeVal === 'LAST_3_DAYS') {
      startDate = this.getTpeDateString(-2);
      endDate = this.getTpeDateString(0);
    } else if (rangeVal === 'LAST_7_DAYS') {
      startDate = this.getTpeDateString(-6);
      endDate = this.getTpeDateString(0);
    } else if (rangeVal === 'CUSTOM') {
      startDate = this.exportStart.value;
      endDate = this.exportEnd.value;
      
      // 🌟 新增防呆：如果選擇自訂卻沒選日期，阻擋匯出
      if (!startDate || !endDate) {
        return alert('請先選擇完整的起訖日期！');
      }
      if (new Date(startDate) > new Date(endDate)) {
        return alert('結束日期不能早於開始日期！');
      }
    }

    this.exportBtn.textContent = '⏳ 處理中...';
    try {
      const blob = await this.api.exportCsv('/api/export', { startDate, endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      let dateSuffix = '_全部';
      if (startDate && endDate) {
        dateSuffix = startDate === endDate ? `_${startDate}` : `_${startDate}至${endDate}`;
      }
      
      a.download = `工讀生打卡總表${dateSuffix}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      this.exportBtn.textContent = '✅ 下載成功';
    } catch (e) {
      alert('匯出失敗，請確認是否登入或網路連線');
    } finally {
      setTimeout(() => this.exportBtn.textContent = '📊 下載報表', 3000);
    }
  }
}