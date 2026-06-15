const { isCloudReady } = require('~/utils/cloud');

const AUTH_STORAGE_KEY = 'miniAuthSession';
const LOCAL_OPENID_KEY = 'miniLocalOpenid';
const LOCAL_PROFILE_KEY = 'miniLocalProfile';

function getDefaultProfile() {
  return {
    nickName: '微信用户',
    avatarUrl: '',
  };
}

function normalizeSession(session = {}) {
  return {
    openid: session.openid || '',
    appid: session.appid || '',
    unionid: session.unionid || '',
    profile: session.profile || getDefaultProfile(),
    loginAt: session.loginAt || Date.now(),
  };
}

function isProfileComplete(profile) {
  return Boolean(profile && profile.nickName && profile.nickName !== '微信用户');
}

function getSession() {
  const session = wx.getStorageSync(AUTH_STORAGE_KEY);
  if (!session || !session.openid) return null;
  return normalizeSession(session);
}

function setSession(session) {
  const normalized = normalizeSession(session);
  wx.setStorageSync(AUTH_STORAGE_KEY, normalized);
  return normalized;
}

function clearSession() {
  wx.removeStorageSync(AUTH_STORAGE_KEY);
}

function getLocalOpenid() {
  const saved = wx.getStorageSync(LOCAL_OPENID_KEY);
  if (saved) return saved;
  const openid = `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  wx.setStorageSync(LOCAL_OPENID_KEY, openid);
  return openid;
}

function loginWithCloud(profile = getDefaultProfile()) {
  if (!isCloudReady()) {
    return Promise.resolve(setSession({
      openid: getLocalOpenid(),
      appid: 'local-preview',
      profile,
      loginAt: Date.now(),
    }));
  }

  return wx.cloud
    .callFunction({
      name: 'login',
      data: {},
    })
    .then((res) => {
      const result = res.result || {};
      const session = setSession({
        openid: result.openid,
        appid: result.appid,
        unionid: result.unionid,
        profile: result.profile || profile,
        loginAt: Date.now(),
      });
      return session;
    });
}

// 仅读取本地缓存的资料（云分支读 session，非云分支读 LOCAL_PROFILE_KEY），
// 不发起云请求；如需远端最新资料请走 login 云函数。
function getCachedProfile(openid) {
  if (!isCloudReady()) {
    const saved = wx.getStorageSync(LOCAL_PROFILE_KEY);
    return Promise.resolve(saved && saved.nickName ? saved : null);
  }
  return Promise.resolve(getSession()).then((session) => {
    if (session && session.profile && session.openid === openid) {
      return session.profile;
    }
    return null;
  });
}

function updateUserProfile(nickName, avatarFileID) {
  if (!isCloudReady()) {
    const profile = { nickName, avatarUrl: avatarFileID || '' };
    wx.setStorageSync(LOCAL_PROFILE_KEY, profile);
    const session = getSession();
    if (session) {
      session.profile = profile;
      return Promise.resolve(setSession(session));
    }
    return Promise.resolve(setSession({
      openid: getLocalOpenid(),
      appid: 'local-preview',
      profile,
    }));
  }
  return wx.cloud
    .callFunction({
      name: 'updateProfile',
      data: { nickName, avatarFileID },
    })
    .then((res) => {
      if (!res.result || !res.result.success) {
        throw new Error(res.result && res.result.error || '保存失败');
      }
      const existing = getSession() || {};
      return setSession({
        ...existing,
        openid: res.result.openid,
        profile: {
          nickName: res.result.nickName,
          avatarUrl: res.result.avatarFileID || '',
        },
        loginAt: Date.now(),
      });
    });
}

module.exports = {
  AUTH_STORAGE_KEY,
  clearSession,
  getCachedProfile,
  getDefaultProfile,
  getSession,
  isProfileComplete,
  loginWithCloud,
  normalizeSession,
  setSession,
  updateUserProfile,
};
