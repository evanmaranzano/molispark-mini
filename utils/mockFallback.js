/**
 * Mock 数据降级工具（v0.2.0 策略重构）。
 *
 * 开发/体验模式：云数据库无数据或抛错时，降级到本地 mock，方便离线调试。
 * 正式模式：云失败或空结果不再静默塞 mock，返回带 __loadError 标记的错误对象，
 * 由调用方页面显式展示错误态 + 重试，避免生产环境用户看到假数据。
 *
 * 错误对象契约：
 *   { __loadError: true, error: <原始错误或 null> }
 * 页面通过 result && result.__loadError 判断加载失败，走错误态分支。
 */

const mock = require('~/mock/community');
const { allowMockFallback } = require('~/utils/runtime');

function makeLoadError(err) {
  return { __loadError: true, error: err || null };
}

function isEmptyResult(result) {
  if (!result) return true;
  if (result.__fromLocalDb) return false;
  if (Array.isArray(result)) return result.length === 0;
  return false;
}

/**
 * 带 mock fallback 的列表加载。
 * @param {Function} cloudFn 云数据库查询函数
 * @param {Function} mockFn mock 数据函数
 * @param {Array} args mock 函数参数
 * @returns {Promise<Array|Object>} 成功返回数组；生产模式失败返回 { __loadError }
 */
async function withMockFallback(cloudFn, mockFn, ...args) {
  try {
    const result = await cloudFn();
    if (result && result.__fromLocalDb) {
      return result;
    }
    if (!isEmptyResult(result)) {
      return result;
    }
    // 结果为空：正常业务状态（列表无数据），不是加载失败。
    // 生产模式直接返回空数组，开发模式降级 mock 填充假数据。
    if (!allowMockFallback()) {
      return [];
    }
  } catch (err) {
    // 云调用抛错：生产模式透传错误对象，开发模式降级 mock
    if (!allowMockFallback()) {
      return makeLoadError(err);
    }
  }
  return mockFn ? mockFn(...args) : [];
}

/**
 * 带 mock fallback 的单条加载。
 * @returns {Promise<Object|null|Object>} 成功返回对象/null；生产模式失败返回 { __loadError }
 */
async function withMockFallbackOne(cloudFn, mockFn, ...args) {
  try {
    const result = await cloudFn();
    if (result && result.__fromLocalDb) {
      return result;
    }
    if (result) return result;
    // 结果为空：生产模式视为加载失败，开发模式降级 mock
    if (!allowMockFallback()) {
      return makeLoadError(null);
    }
  } catch (err) {
    if (!allowMockFallback()) {
      return makeLoadError(err);
    }
  }
  return mockFn ? mockFn(...args) : null;
}

module.exports = { withMockFallback, withMockFallbackOne, makeLoadError };
