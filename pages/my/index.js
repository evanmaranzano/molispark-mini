import useToastBehavior from '~/behaviors/useToast';
import { getUserStats, deleteAccount } from '~/utils/db';

const {
  clearSession,
  getSession,
  isProfileComplete,
  updateUserProfile,
} = require('~/utils/auth');
const { isCloudReady } = require('~/utils/cloud');
const { uploadFile } = require('~/utils/storage');

const GUEST_PROFILE = {
  name: '点击登录',
  level: '',
  brief: '登录后查看帖子、收藏与消息',
  avatarText: '登',
  avatarUrl: '',
};

const MENU_LIST = [
  { title: '我的帖子', desc: '查看已发布与草稿内容', color: '#2fb67d' },
  { title: '我的收藏', desc: '管理收藏的内容详情', color: '#ffb74a' },
  { title: '浏览记录', desc: '继续阅读最近浏览内容', color: '#4f9df7' },
  { title: '活动报名', desc: '查看最新活动并报名', color: '#b97a43', url: '/pages/activities/index' },
  { title: '我的报名', desc: '管理已报名的活动', color: '#4aa978', url: '/pages/myActivities/index' },
  { title: '消息中心', desc: '查看互动通知与消息', color: '#6b8afd', url: '/pages/message/index' },
];

const SERVICE_LIST = [
  { title: '设置', desc: '清除缓存、关于摩力创境', color: '#dfe5ea', url: '/pages/setting/index' },
  { title: '隐私政策', desc: '用户协议与隐私政策', color: '#dfe5ea', url: '/pages/privacy/index' },
  { title: '注销账号', desc: '删除账号及云端个人数据', color: '#dfe5ea' },
  { title: '帮助与反馈', desc: '提交问题与功能建议', color: '#dfe5ea', url: '/pages/feedback/index' },
];

const GUEST_ALLOWED = ['隐私政策', '活动报名', '设置', '帮助与反馈'];

function buildProfile(authSession) {
  if (!authSession) return GUEST_PROFILE;
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
    profile: GUEST_PROFILE,
    stats: [
      { label: '我的帖子', value: '0' },
      { label: '收到的赞', value: '0' },
      { label: '我的收藏', value: '0' },
    ],
    menuList: MENU_LIST,
    serviceList: SERVICE_LIST,
    isAuthed: false,
    showProfileSetup: false,
    showLoginModal: false,
    setupAvatarUrl: '',
    setupNickname: '',
    setupAvatarFileID: '',
    setupSubmitting: false,
  },

  onShow() {
    this.syncTabBar();
    this.syncAuthState();
    if (!this.data.isAuthed) {
      this.setData({ showLoginModal: true });
    }
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
      app.globalData.openid = authSession.openid;
      app.globalData.userInfo = authSession.profile;
    }
    this.setData({
      isAuthed,
      profile: buildProfile(isAuthed ? authSession : null),
    });
    if (isAuthed) {
      this.loadStats();
    } else {
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
      // 云数据库未配置时保持 0
    }
  },

  onProfileTap() {
    if (!this.data.isAuthed) this.handleShowLogin();
  },

  handleShowLogin() {
    this.setData({ showLoginModal: true });
  },

  onLogined() {
    this.setData({ showLoginModal: false });
    this.syncAuthState();
  },

  onLoginModalClose() {
    this.setData({ showLoginModal: false });
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
      .then(() => {
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

  handleDeleteAccount() {
    if (!this.data.isAuthed) {
      this.setData({ showLoginModal: true });
      return;
    }
    wx.showModal({
      title: '注销账号',
      content: '注销后将删除你的个人资料与互动数据，且无法恢复。确定注销吗？',
      confirmColor: '#e6432d',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '注销中', mask: true });
        try {
          const result = await deleteAccount();
          if (result && result.success === false) {
            wx.hideLoading();
            wx.showToast({ title: '注销失败', icon: 'none' });
            return;
          }
          clearSession();
          const app = getApp();
          app.globalData.openid = '';
          app.globalData.userInfo = null;
          wx.hideLoading();
          wx.showToast({ title: '账号已注销', icon: 'none' });
          this.syncAuthState();
        } catch (err) {
          wx.hideLoading();
          console.error('deleteAccount failed:', err);
          wx.showToast({ title: '注销失败', icon: 'none' });
        }
      },
    });
  },

  onMenuTap(e) {
    const { title, url } = e.currentTarget.dataset;
    if (title === '注销账号') {
      this.handleDeleteAccount();
      return;
    }
    if (!this.data.isAuthed && GUEST_ALLOWED.indexOf(title) === -1) {
      this.setData({ showLoginModal: true });
      return;
    }
    const routeMap = {
      我的帖子: '/pages/myPosts/index',
      我的收藏: '/pages/favorites/index',
      浏览记录: '/pages/history/index',
      活动报名: '/pages/activities/index',
      我的报名: '/pages/myActivities/index',
      消息中心: '/pages/message/index',
      隐私政策: '/pages/privacy/index',
    };
    const targetUrl = url || routeMap[title];
    if (targetUrl) {
      wx.navigateTo({ url: targetUrl });
      return;
    }
    this.onShowToast('#t-toast', title);
  },
});
