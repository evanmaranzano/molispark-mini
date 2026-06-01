/**
 * Mock 数据降级工具
 * 云数据库无数据或未配置时，自动降级到本地 mock 数据
 */

const mock = require('~/mock/community');

/**
 * 带 mock fallback 的数据加载
 * @param {Function} cloudFn 云数据库查询函数
 * @param {Function} mockFn mock 数据函数
 * @param {Array} args mock 函数参数
 * @returns {Promise<Array>}
 */
async function withMockFallback(cloudFn, mockFn, ...args) {
  try {
    const result = await cloudFn();
    if (result && result.__fromLocalDb) {
      return result;
    }
    if (result && (Array.isArray(result) ? result.length > 0 : true)) {
      return result;
    }
  } catch (err) {
    // 云数据库未配置或查询失败，降级到 mock
  }
  return mockFn ? mockFn(...args) : [];
}

/**
 * 带 mock fallback 的单条数据加载
 */
async function withMockFallbackOne(cloudFn, mockFn, ...args) {
  try {
    const result = await cloudFn();
    if (result && result.__fromLocalDb) {
      return result;
    }
    if (result) return result;
  } catch (err) {
    // 降级
  }
  return mockFn ? mockFn(...args) : null;
}

module.exports = { withMockFallback, withMockFallbackOne };
