const Module = require('module');
const { test } = require('node:test');
const assert = require('node:assert');

// 注册 ~/ 别名（微信小程序 resolveAlias 的 Node 端模拟），让 db/mock 能被 require。
// 仅在本测试进程生效，不影响小程序运行时。
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, ...rest) {
  if (request.startsWith('~/')) {
    const mapped = request.replace(/^~/, __dirname + '/..');
    return originalResolve.call(this, mapped, ...rest);
  }
  return originalResolve.call(this, request, ...rest);
};

// mock community 提供占位数据，供 fallback 分支断言
require('../mock/community');

function loadMockFallback(allowFallback) {
  // 控制 runtime.allowMockFallback 的返回，模拟开发/生产模式
  const runtimePath = require.resolve('../utils/runtime');
  delete require.cache[runtimePath];
  require.cache[runtimePath] = {
    id: runtimePath,
    filename: runtimePath,
    loaded: true,
    exports: { allowMockFallback: () => allowFallback },
  };
  const mfPath = require.resolve('../utils/mockFallback');
  delete require.cache[mfPath];
  return require('../utils/mockFallback');
}

test('withMockFallback：云成功返回数组（无论模式）', async () => {
  const { withMockFallback } = loadMockFallback(false);
  const result = await withMockFallback(
    async () => [{ id: 1, title: 'A' }],
    () => [{ id: 99, title: 'MOCK' }]
  );
  assert.deepStrictEqual(result, [{ id: 1, title: 'A' }]);
});

test('withMockFallback：开发模式云抛错降级到 mock', async () => {
  const { withMockFallback } = loadMockFallback(true);
  const result = await withMockFallback(
    async () => { throw new Error('cloud down'); },
    () => [{ id: 99, title: 'MOCK' }]
  );
  assert.deepStrictEqual(result, [{ id: 99, title: 'MOCK' }]);
});

test('withMockFallback：生产模式云抛错返回 __loadError，不塞 mock', async () => {
  const { withMockFallback } = loadMockFallback(false);
  const result = await withMockFallback(
    async () => { throw new Error('cloud down'); },
    () => [{ id: 99, title: 'MOCK' }]
  );
  assert.ok(result && result.__loadError, '应返回带 __loadError 的错误对象');
  assert.strictEqual(Array.isArray(result), false, '错误对象不应是数组');
});

test('withMockFallback：生产模式云返回空数组视为正常空列表（非错误），返回空数组', async () => {
  const { withMockFallback } = loadMockFallback(false);
  const result = await withMockFallback(
    async () => [],
    () => [{ id: 99, title: 'MOCK' }]
  );
  assert.deepStrictEqual(result, []);
});

test('withMockFallback：开发模式云返回空数组降级到 mock', async () => {
  const { withMockFallback } = loadMockFallback(true);
  const result = await withMockFallback(
    async () => [],
    () => [{ id: 99, title: 'MOCK' }]
  );
  assert.deepStrictEqual(result, [{ id: 99, title: 'MOCK' }]);
});

test('withMockFallbackOne：生产模式云抛错返回 __loadError', async () => {
  const { withMockFallbackOne } = loadMockFallback(false);
  const result = await withMockFallbackOne(
    async () => { throw new Error('cloud down'); },
    () => ({ id: 99, title: 'MOCK' })
  );
  assert.ok(result && result.__loadError);
});

test('withMockFallbackOne：生产模式云返回 null 返回 __loadError（detail 救命场景）', async () => {
  const { withMockFallbackOne } = loadMockFallback(false);
  const result = await withMockFallbackOne(
    async () => null,
    () => ({ id: 99, title: 'MOCK' })
  );
  assert.ok(result && result.__loadError);
});

test('withMockFallbackOne：开发模式云返回 null 降级到 mock', async () => {
  const { withMockFallbackOne } = loadMockFallback(true);
  const result = await withMockFallbackOne(
    async () => null,
    () => ({ id: 99, title: 'MOCK' })
  );
  assert.deepStrictEqual(result, { id: 99, title: 'MOCK' });
});

test('withMockFallbackOne：云成功返回对象（无论模式）', async () => {
  const { withMockFallbackOne } = loadMockFallback(false);
  const result = await withMockFallbackOne(
    async () => ({ id: 1, title: 'A' }),
    () => ({ id: 99, title: 'MOCK' })
  );
  assert.deepStrictEqual(result, { id: 1, title: 'A' });
});
