const { test } = require('node:test');
const assert = require('node:assert');

function setupWx(envVersion) {
  // runtime.js 模块级缓存了 envVersion，每次重置后重新 require
  delete require.cache[require.resolve('../utils/runtime')];
  if (envVersion === undefined) {
    global.wx = {};
  } else {
    global.wx = {
      getAccountInfoSync: () => ({ miniProgram: { envVersion } }),
    };
  }
}

test('envVersion=develop 判为非生产，允许 mock fallback', () => {
  setupWx('develop');
  const { isProduction, allowMockFallback, getEnvVersion } = require('../utils/runtime');
  assert.strictEqual(getEnvVersion(), 'develop');
  assert.strictEqual(isProduction(), false);
  assert.strictEqual(allowMockFallback(), true);
});

test('envVersion=trial 判为非生产，但审核期同样禁止 mock fallback', () => {
  setupWx('trial');
  const { isProduction, allowMockFallback } = require('../utils/runtime');
  assert.strictEqual(isProduction(), false);
  assert.strictEqual(allowMockFallback(), false);
});

test('envVersion=release 判为生产，禁止 mock fallback', () => {
  setupWx('release');
  const { isProduction, allowMockFallback } = require('../utils/runtime');
  assert.strictEqual(isProduction(), true);
  assert.strictEqual(allowMockFallback(), false);
});

test('getAccountInfoSync 不可用时（低基础库 / Node 环境）兜底按 release 处理', () => {
  setupWx(undefined);
  const { isProduction, allowMockFallback } = require('../utils/runtime');
  // 保守：拿不到信息按生产处理，宁可显错不塞假数据
  assert.strictEqual(isProduction(), true);
  assert.strictEqual(allowMockFallback(), false);
});

test('envVersion 缓存：首次读取后不再重复调用 API', () => {
  let callCount = 0;
  delete require.cache[require.resolve('../utils/runtime')];
  global.wx = {
    getAccountInfoSync: () => {
      callCount += 1;
      return { miniProgram: { envVersion: 'develop' } };
    },
  };
  const { isProduction, getEnvVersion } = require('../utils/runtime');
  getEnvVersion();
  getEnvVersion();
  isProduction();
  assert.strictEqual(callCount, 1, 'getAccountInfoSync 应只调用一次');
});
