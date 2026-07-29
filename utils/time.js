/**
 * 时间显示工具：把 createdAt（Date / ISO 字符串 / 时间戳）格式化为中文相对时间。
 * 非时间字符串（mock 的 '2 小时前'、'精华'、'草稿' 等）原样返回；无法解析返回空串。
 */

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    // 兼容 'YYYY-MM-DD HH:mm'（iOS new Date 不支持连字符带空格格式）
    const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatTime(value) {
  if (typeof value === 'string' && !toDate(value)) return value;
  const date = toDate(value);
  if (!date) return '';

  const diff = Date.now() - date.getTime();
  if (diff < 0) return formatDate(date);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDate(date);
}

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

module.exports = { formatTime, formatDate };
