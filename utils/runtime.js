/**
 * 运行模式判定。
 *
 * 依据 wx.getAccountInfoSync().miniProgram.envVersion 区分：
 *   develop — 开发版（开发者工具）
 *   trial   — 体验版（提审后审核中也可能落到 trial）
 *   release — 正式版（已发布上线）
 *
 * mock fallback 策略：仅 develop 允许降级 mock 方便离线调试。
 * trial 也按正式版处理，审核期不再展示 mock；trial 与 release 一样走显式错误态，
 * 云错误必须返回由页面展示，避免审核员看到假数据。
 */

let cachedEnvVersion;

function getEnvVersion() {
  if (cachedEnvVersion) return cachedEnvVersion;
  try {
    const info = wx.getAccountInfoSync();
    cachedEnvVersion = (info && info.miniProgram && info.miniProgram.envVersion) || 'release';
  } catch (err) {
    // API 不可用（低基础库 / Node 单测环境）：保守按 release 处理，
    // 宁可显错也不在生产意外塞 mock。
    cachedEnvVersion = 'release';
  }
  return cachedEnvVersion;
}

function isProduction() {
  return getEnvVersion() === 'release';
}

function allowMockFallback() {
  return getEnvVersion() === 'develop';
}

module.exports = { getEnvVersion, isProduction, allowMockFallback };
