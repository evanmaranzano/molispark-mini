import useToastBehavior from '~/behaviors/useToast';
import { myMenus, myServices, myStats, profile } from '~/mock/community';
import { getUserStats } from '~/utils/db';

const { clearSession, getDefaultProfile, getSession, loginWithCloud } = require('~/utils/auth');

function buildProfile(authSession) {
  if (!authSession) return profile;
  const nickName = authSession.profile.nickName || '微信用户';
  return {
    name: nickName,
    level: '已登录',
    brief: authSession.openid ? `openid：${authSession.openid.slice(0, 10)}...` : '微信登录用户',
    avatarText: nickName.slice(0, 1) || '微',
    avatarUrl: authSession.profile.avatarUrl || '',
  };
}

Page({
  behaviors: [useToastBehavior],

  data: {
    profile,
    stats: [
      { label: '我的帖子', value: '0' },
      { label: '收到的赞', value: '0' },
      { label: '我的收藏', value: '0' },
    ],
    menuList: myMenus,
    serviceList: myServices,
    isAuthed: false,
  },

  onShow() {
    this.syncAuthState();
  },

  syncAuthState() {
    const authSession = getSession();
    const isAuthed = Boolean(authSession);
    this.setData({
      isAuthed,
      profile: buildProfile(authSession),
    });
    if (isAuthed) {
      this.loadStats();
    }
  },

  async loadStats() {
    const app = getApp();
    const { openid } = app.globalData;
    if (!openid) return;
    try {
      const stats = await getUserStats(openid);
      this.setData({
        stats: [
          { label: '我的帖子', value: String(stats.posts) },
          { label: '收到的赞', value: String(stats.likes) },
          { label: '我的收藏', value: String(stats.collects) },
        ],
      });
    } catch (err) {
      // 云数据库未配置时保持 mock 默认值
    }
  },

  handleLogin() {
    const fallbackProfile = getDefaultProfile();
    const finishLogin = (userProfile) => {
      wx.showLoading({ title: '登录中', mask: true });
      loginWithCloud(userProfile)
        .then(() => {
          const app = getApp();
          app.globalData.openid = getSession().openid;
          app.globalData.userInfo = userProfile;
          this.syncAuthState();
          wx.hideLoading();
          wx.showToast({ title: '登录成功', icon: 'success' });
        })
        .catch((error) => {
          wx.hideLoading();
          console.error('cloud login failed', error);
          wx.showToast({ title: '登录失败', icon: 'none' });
        });
    };

    wx.getUserProfile({
      desc: '用于完善会员资料展示',
      success: (res) => finishLogin(res.userInfo || fallbackProfile),
      fail: () => finishLogin(fallbackProfile),
    });
  },

  handleLogout() {
    clearSession();
    const app = getApp();
    app.globalData.openid = '';
    app.globalData.userInfo = null;
    this.syncAuthState();
    wx.showToast({ title: '已退出登录', icon: 'none' });
  },

  onMenuTap(e) {
    const { title, url } = e.currentTarget.dataset;
    const routeMap = {
      我的帖子: '/pages/myPosts/index',
      我的收藏: '/pages/favorites/index',
      浏览记录: '/pages/history/index',
      下载管理: '/pages/history/index',
    };
    const targetUrl = url || routeMap[title];
    if (targetUrl) {
      wx.navigateTo({ url: targetUrl });
      return;
    }
    this.onShowToast('#t-toast', title);
  },
});
