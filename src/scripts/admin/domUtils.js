export function escHtml(str) {
  // XSS 防護：所有需要塞進 template string 的外部資料都先轉義成純文字。
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
