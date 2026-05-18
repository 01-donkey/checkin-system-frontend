export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.password = ''; // 登入成功後儲存密碼，供其他請求使用
  }

  setPassword(pwd) {
    this.password = pwd;
  }

  // 🌟【架構優化】：建立統一的底層連線方法，集中管理超時與錯誤
  async _fetchWithTimeout(endpoint, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal
      });

      // 攔截 500 等伺服器嚴重錯誤 (400, 401, 403 通常是自定義的業務錯誤，保留給 json 解析)
      if (!res.ok && res.status >= 500) {
        throw new Error(`伺服器異常 (HTTP ${res.status})`);
      }
      return res;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('連線超時，請檢查網路狀態後再試');
      }
      throw err; // 將其他錯誤往上拋
    } finally {
      clearTimeout(timeout); // 確保請求完成後清除計時器，釋放記憶體
    }
  }

  async post(endpoint, body = {}) {
    const finalBody = { password: this.password, ...body };
    const res = await this._fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalBody)
    });
    return res.json();
  }

  async put(endpoint, body = {}) {
    const finalBody = { password: this.password, ...body };
    const res = await this._fetchWithTimeout(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalBody)
    });
    return res.json();
  }

  async get(endpoint) {
    const res = await this._fetchWithTimeout(endpoint, {
      method: 'GET'
    });
    return res.json();
  }

  async exportCsv(endpoint, body = {}) {
    const finalBody = { password: this.password, ...body };
    const res = await this._fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalBody)
    });
    
    if (!res.ok) throw new Error('報表匯出失敗');
    return res.blob();
  }
}