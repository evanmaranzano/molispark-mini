import useToastBehavior from '~/behaviors/useToast';
import { myMenus, myServices, myStats, profile } from '~/mock/community';
import { getUserStats } from '~/utils/db';

const {
  clearSession,
  getDefaultProfile,
  getSession,
  isProfileComplete,
  loginWithCloud,
  updateUserProfile,
} = require('~/utils/auth');
const { isCloudReady } = require('~/utils/cloud');
const { uploadFile } = require('~/utils/storage');

function buildProfile(authSession) {
  if (!authSession) return profile;
  const nickName = authSession.profile.nickName || '微信用户';
  return {
    name: nickName,
    level: '已登录',
    brief: '微信登录用户',
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
    showProfileSetup: false,
    setupAvatarUrl: '',
    setupNickname: '',
    setupAvatarFileID: '',
    setupSubmitting: false,
  },

  onShow() {
    this.syncTabBar();
    this.syncAuthState();
  },

  syncTabBar() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.syncActiveTab) tabBar.syncActiveTab();
  },

  syncAuthState() {
    const authSession = getSession();
    const isAuthed = Boolean(authSession && isProfileComplete(authSession.profile));
    const app = getApp();
    if (isAuthed) {
      // 已填资料：openid + userInfo 写回 globalData，供互动/统计使用
      app.globalData.openid = authSession.openid;
      app.globalData.userInfo = authSession.profile;
    }
    // 未填资料不清空 globalData.openid：它是登录凭证，detail 页点赞/收藏仍需要。
    // my 页内容访问（loadStats/菜单）由 isAuthed 门禁，未填资料时 stats 不加载、显示引导。
    this.setData({
      isAuthed,
      profile: buildProfile(isAuthed ? authSession : null),
    });
    if (isAuthed) {
      this.loadStats();
    } else {
      // 未登录/未填资料：stats 重置为 0，避免残留上次登录的数字
      this.setData({
        stats: [
          { label: '我的帖子', value: '0' },
          { label: '收到的赞', value: '0' },
          { label: '我的收藏', value: '0' },
        ],
      });
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
    wx.showLoading({ title: '登录中', mask: true });
    const fallbackProfile = getDefaultProfile();
    loginWithCloud(fallbackProfile)
      .then((session) => {
        wx.hideLoading();
        const cloudProfile = isProfileComplete(session.profile) ? session.profile : null;
        this.syncAuthState();
        if (cloudProfile) {
          wx.showToast({ title: '登录成功', icon: 'success' });
        } else {
          this.setData({
            showProfileSetup: true,
            setupAvatarUrl: '',
            setupNickname: '',
            setupAvatarFileID: '',
          });
        }
      })
      .catch((error) => {
        wx.hideLoading();
        console.error('[handleLogin] error:', error);
        wx.showToast({ title: `登录失败: ${error && error.message || error && error.errMsg || '未知'}`, icon: 'none', duration: 3000 });
      });
  },

  handleEditProfile() {
    const authSession = getSession();
    if (!authSession) return;
    const avatarUrl = authSession.profile.avatarUrl || '';
    this.setData({
      showProfileSetup: true,
      setupAvatarUrl: avatarUrl,
      setupNickname: authSession.profile.nickName || '',
      setupAvatarFileID: avatarUrl.indexOf('cloud://') === 0 ? avatarUrl : '',
    });
  },

  onSetupAvatarChoose(e) {
    const avatarUrl = e.detail.avatarUrl || '';
    if (!avatarUrl) return;
    this.setData({ setupAvatarUrl: avatarUrl });
    if (!isCloudReady()) {
      this.setData({ setupAvatarFileID: avatarUrl });
      return;
    }
    wx.showLoading({ title: '上传头像中', mask: true });
    const session = getSession();
    const openid = getApp().globalData.openid || (session && session.openid);
    if (!openid) {
      wx.hideLoading();
      wx.showToast({ title: '登录信息失效，请重新登录', icon: 'none' });
      this.setData({ setupAvatarUrl: '', setupAvatarFileID: '' });
      return;
    }
    const extMatch = avatarUrl.split('?')[0].match(/\.([a-zA-Z0-9]{1,4})$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
    uploadFile(avatarUrl, `avatars/${openid}.${ext}`)
      .then((fileID) => {
        this.setData({ setupAvatarFileID: fileID });
      })
      .catch((err) => {
        console.error('头像上传失败:', err);
        wx.showToast({ title: '头像上传失败', icon: 'none' });
        this.setData({ setupAvatarUrl: '', setupAvatarFileID: '' });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  onSetupNicknameInput(e) {
    this.setData({ setupNickname: e.detail.value || '' });
  },

  closeProfileSetup() {
    this.setData({
      showProfileSetup: false,
      setupAvatarUrl: '',
      setupNickname: '',
      setupAvatarFileID: '',
    });
  },

  noop() {},

  submitProfileSetup() {
    const { setupNickname, setupAvatarFileID, setupSubmitting } = this.data;
    const nickName = (setupNickname || '').trim();
    if (!nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (setupSubmitting) return;
    this.setData({ setupSubmitting: true });

    updateUserProfile(nickName, setupAvatarFileID)
      .then((session) => {
        this.setData({ showProfileSetup: false, setupSubmitting: false });
        this.syncAuthState();
        wx.showToast({ title: '保存成功', icon: 'success' });
      })
      .catch((err) => {
        this.setData({ setupSubmitting: false });
        console.error('updateUserProfile failed:', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
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
    // 未填资料（isAuthed=false）不允许查看我的帖子/收藏/历史等个人内容，引导去填资料
    if (!this.data.isAuthed) {
      this.setData({ showProfileSetup: true });
      return;
    }
    const routeMap = {
      我的帖子: '/pages/myPosts/index',
      我的收藏: '/pages/favorites/index',
      浏览记录: '/pages/history/index',
    };
    const targetUrl = url || routeMap[title];
    if (targetUrl) {
      wx.navigateTo({ url: targetUrl });
      return;
    }
    this.onShowToast('#t-toast', title);
  },
});
