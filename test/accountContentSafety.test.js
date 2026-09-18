const Module = require('module');
const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadCloudFunction(filePath, cloudMock) {
  const originalLoad = Module._load;
  delete require.cache[filePath];
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'wx-server-sdk') return cloudMock;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(filePath);
  } finally {
    Module._load = originalLoad;
  }
}

function makeActivityCloudMock() {
  let mediaResult = { trace_id: 'trace-accepted' };
  const state = { mediaCalls: [], added: null };
  const database = {
    command: { inc: (value) => value },
    serverDate: () => new Date('2026-01-01T00:00:00.000Z'),
    collection(name) {
      if (name === 'users') {
        return {
          where: () => ({ get: async () => ({ data: [{ role: 'admin' }] }) }),
          doc: () => ({ get: async () => ({ data: { role: 'admin' } }) }),
        };
      }
      if (name === 'activities') {
        return {
          add: async ({ data }) => {
            state.added = data;
            return { _id: 'activity-1' };
          },
        };
      }
      throw new Error(`unexpected collection: ${name}`);
    },
  };
  const cloud = {
    DYNAMIC_CURRENT_ENV: 'test-env',
    init() {},
    database: () => database,
    getWXContext: () => ({ OPENID: 'admin-openid' }),
    getTempFileURL: async () => ({ fileList: [{ tempFileURL: 'https://example.test/video.mp4' }] }),
    openapi: {
      security: {
        msgSecCheck: async () => ({ result: { suggest: 'pass' } }),
        imgSecCheck: async () => ({ errCode: 0 }),
        mediaCheckAsync: async (params) => {
          state.mediaCalls.push(params);
          return mediaResult;
        },
      },
    },
    setMediaResult(result) {
      mediaResult = result;
    },
    state,
  };
  return cloud;
}

test('activity create rejects unsafe video before writing the activity', async () => {
  const filePath = require.resolve('../cloudfunctions/activity/index');
  const cloud = makeActivityCloudMock();
  const activityFunction = loadCloudFunction(filePath, cloud);

  cloud.setMediaResult({ errCode: 87014, errMsg: 'content rejected' });
  const rejected = await activityFunction.main({
    action: 'create',
    title: '活动标题',
    desc: '活动简介',
    videos: ['cloud://env/video.mp4'],
  });

  assert.equal(rejected.success, false);
  assert.equal(rejected.code, 'CONTENT_REJECTED');
  assert.equal(rejected.reason, '内容含有违法违规信息');
  assert.equal(cloud.state.mediaCalls.length, 1);
  assert.equal(cloud.state.mediaCalls[0].scene, 3);
  assert.equal(cloud.state.mediaCalls[0].mediaType, 2);
  assert.equal(cloud.state.added, null);

  cloud.setMediaResult({ trace_id: 'trace-accepted' });
  const accepted = await activityFunction.main({
    action: 'create',
    title: '活动标题',
    desc: '活动简介',
    videos: ['cloud://env/video.mp4'],
  });

  assert.equal(accepted.success, true);
  assert.deepEqual(cloud.state.added.videos, ['cloud://env/video.mp4']);
  delete require.cache[filePath];
});

function makeAccountCloudMock({ failReports = false } = {}) {
  const records = {
    users: [{ _id: 'user-openid', _openid: 'user-openid', avatarUrl: 'cloud://env/avatar.png' }],
    signups: [],
    likes: [],
    collects: [],
    history: [],
    messages: [],
    feedback: [],
    views: [],
    reports: [{ _id: 'report-1', reporterOpenid: 'user-openid', _openid: 'user-openid' }],
    posts: [{ _id: 'post-1', _openid: 'user-openid', author: '原用户' }],
    comments: [],
  };
  const state = { deletedFiles: [] };
  const missing = () => ({ errCode: -1, errMsg: 'document not exist' });
  const database = {
    command: { or: (conditions) => conditions },
    collection(name) {
      const collection = records[name];
      if (!collection) throw new Error(`unexpected collection: ${name}`);
      return {
        where() {
          const chain = {
            skip: () => chain,
            limit: () => chain,
            get: async () => ({ data: collection.slice() }),
          };
          return chain;
        },
        doc(id) {
          return {
            get: async () => {
              const item = collection.find((entry) => entry._id === id);
              if (!item) throw missing();
              return { data: item };
            },
            remove: async () => {
              if (name === 'reports' && failReports) throw { errCode: 700, errMsg: 'remove failed' };
              const index = collection.findIndex((entry) => entry._id === id);
              if (index < 0) throw missing();
              collection.splice(index, 1);
            },
            update: async ({ data }) => {
              const item = collection.find((entry) => entry._id === id);
              if (!item) throw missing();
              Object.assign(item, data);
            },
          };
        },
      };
    },
  };
  return {
    DYNAMIC_CURRENT_ENV: 'test-env',
    init() {},
    database: () => database,
    getWXContext: () => ({ OPENID: 'user-openid' }),
    deleteFile: async ({ fileList }) => {
      state.deletedFiles.push(...fileList);
    },
    records,
    state,
  };
}

test('account deletion removes reporter records and personal files', async () => {
  const filePath = require.resolve('../cloudfunctions/account/index');
  const cloud = makeAccountCloudMock();
  const accountFunction = loadCloudFunction(filePath, cloud);
  const result = await accountFunction.main({ action: 'deleteAccount' });

  assert.equal(result.success, true);
  assert.equal(result.deleted.reports, 1);
  assert.equal(result.deleted.avatarFiles, 1);
  assert.equal(cloud.records.reports.length, 0);
  assert.equal(cloud.records.users.length, 0);
  assert.deepEqual(cloud.state.deletedFiles, ['cloud://env/avatar.png']);
  assert.equal(cloud.records.posts[0].author, '已注销用户');
  delete require.cache[filePath];
});

test('account deletion reports partial cleanup instead of claiming success', async () => {
  const filePath = require.resolve('../cloudfunctions/account/index');
  const cloud = makeAccountCloudMock({ failReports: true });
  const accountFunction = loadCloudFunction(filePath, cloud);
  const result = await accountFunction.main({ action: 'deleteAccount' });

  assert.equal(result.success, false);
  assert.equal(result.code, 'DELETE_PARTIAL');
  assert.equal(result.deleted.reports, 0);
  assert.deepEqual(result.failures, [{ collection: 'reports', operation: 'remove', code: '700', count: 1 }]);
  assert.equal(cloud.records.posts[0].author, '已注销用户');
  delete require.cache[filePath];
});
