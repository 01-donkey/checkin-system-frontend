export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.password = ''; // 登入成功後儲存密碼，供其他請求使用
  }

  setPassword(pwd) {
    this.password = pwd;
  }

  async post(endpoint, body = {}) {
    // 自動帶入密碼
    const finalBody = { password: this.password, ...body };
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalBody)
    });
    return res.json();
  }

  async put(endpoint, body = {}) {
    const finalBody = { password: this.password, ...body };
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalBody)
    });
    return res.json();
  }

  async get(endpoint) {
    const res = await fetch(`${this.baseUrl}${endpoint}`);
    return res.json();
  }

  async exportCsv(endpoint, body = {}) {
    const finalBody = { password: this.password, ...body };
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalBody)
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }
}