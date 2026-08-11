const Module = require('module');
const { test } = require('node:test');
const assert = require('node:assert');

const clientStatus = require('../utils/activityStatus');
const cloudStatus = require('../cloudfunctions/activity/activityStatus');

const implementations = [
  ['客户端', clientStatus],
  ['云函数', cloudStatus],
];

implementations.forEach(([label, status]) => {
  test(`${label}：YYYY-MM-DD HH:mm 固定按 +08:00 解析`, () => {
    assert.strictEqual(
      status.parseActivityTime('2026-08-10 00:00'),
      Date.parse('2026-08-09T16:00:00.000Z')
    );
    assert.strictEqual(
      status.parseActivityTime('2026-08-10 23:59'),
      Date.parse('2026-08-10T15:59:00.000Z')
    );
  });

  test(`${label}：结束时刻边界及前后一毫秒`, () => {
    const activity = { status: 'published', endTime: '2026-08-10 12:00' };
    const cutoff = Date.parse('2026-08-10T04:00:00.000Z');
    assert.strictEqual(status.isActivityClosed(activity, cutoff - 1), false);
    assert.strictEqual(status.isActivityClosed(activity, cutoff), true);
    assert.strictEqual(status.isActivityClosed(activity, cutoff + 1), true);
  });

  test(`${label}：缺失或无效 endTime 时回退 startTime`, () => {
    const cutoff = Date.parse('2026-08-10T01:30:00.000Z');
    assert.strictEqual(
      status.getActivityCutoff({ startTime: '2026-08-10 09:30', endTime: '' }),
      cutoff
    );
    assert.strictEqual(
      status.getActivityCutoff({ startTime: '2026-08-10 09:30', endTime: '2026-02-30 10:00' }),
      cutoff
    );
    assert.strictEqual(
      status.isActivityClosed({ status: 'published', startTime: '2026-08-10 09:30' }, cutoff),
      true
    );
  });

  test(`${label}：无有效截止时间保持开放，非 published 状态关闭`, () => {
    assert.strictEqual(status.isActivityClosed({ status: 'published' }, Date.now()), false);
    assert.strictEqual(
      status.isActivityClosed({ status: 'closed', endTime: '2099-01-01 00:00' }, Date.now()),
      true
    );
  });

  test(`${label}：拒绝无时区的非标准字符串，接受显式时区`, () => {
    assert.strictEqual(status.parseActivityTime('2026-08-10T12:00'), null);
    assert.strictEqual(
      status.parseActivityTime('2026-08-10T12:00:00+08:00'),
      Date.parse('2026-08-10T04:00:00.000Z')
    );
  });
});

test('云函数 signup 服务拒绝已过期活动并返回 ACTIVITY_CLOSED', async () => {
  const cloudFunctionPath = require.resolve('../cloudfunctions/activity/index');
  const originalLoad = Module._load;
  const database = {
    command: { inc: (value) => value },
    collection(name) {
      assert.strictEqual(name, 'activities', '过期活动不应继续读写报名集合');
      return {
        doc: () => ({
          get: async () => ({
            data: {
              _id: 'expired-activity',
              status: 'published',
              endTime: '2020-01-01 00:00',
              signupCount: 0,
            },
          }),
        }),
      };
    },
  };
  const cloudMock = {
    DYNAMIC_CURRENT_ENV: 'test-env',
    init() {},
    database: () => database,
    getWXContext: () => ({ OPENID: 'test-openid' }),
  };

  delete require.cache[cloudFunctionPath];
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'wx-server-sdk') return cloudMock;
    return originalLoad.call(this, request, parent, isMain);
  };

  let activityFunction;
  try {
    activityFunction = require(cloudFunctionPath);
  } finally {
    Module._load = originalLoad;
  }

  const result = await activityFunction.main({
    action: 'signup',
    activityId: 'expired-activity',
    name: '测试用户',
    phone: '13800138000',
  });
  assert.deepStrictEqual(result, {
    success: false,
    action: 'signup',
    activityId: 'expired-activity',
    code: 'ACTIVITY_CLOSED',
  });
  delete require.cache[cloudFunctionPath];
});
