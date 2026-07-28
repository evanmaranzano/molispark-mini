const {
  loginWithCloud,
  updateUserProfile,
  isProfileComplete,
  getDefaultProfile,
  getSession,
} = require('~/utils/auth');
const { isCloudReady } = require('~/utils/cloud');
const { uploadFile } = require('~/utils/storage');

// 全局登录弹窗：微信一键登录 → 新用户补昵称头像 → 完成后同步 globalData 并 triggerEvent('logined')
// 复用 my 页登录逻辑（loginWithCloud / updateUserProfile）
Component({
  properties: {
    show: { type: Boolean, value: false },
  },

  observers: {
    show(val) {
      // 通过 getTabBar() 控制自定义 tabBar 显隐（wx.hideTabBar 对自定义 tabBar 无效）
      try {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const tabBar = page && typeof page.getTabBar === 'function' && page.getTabBar();
        if (tabBar) {
          tabBar.setData({ hidden: !!val });
        }
      } catch (e) {
        // 非 tab 页无 getTabBar，忽略
      }
    },
  },

  data: {
    needSetup: false,
    avatarUrl: '',
    nickname: '',
    avatarFileID: '',
    submitting: false,
  },

  methods: {
    noop() {},

    onLogin() {
      wx.showLoading({ title: '登录中', mask: true });
      loginWithCloud(getDefaultProfile())
        .then((session) => {
          wx.hideLoading();
          // 老用户云上已有完整资料直接完成；新用户进入资料填写
          if (isProfileComplete(session.profile)) {
            this.finishLogin();
          } else {
            this.setData({ needSetup: true });
          }
        })
        .catch((err) => {
          wx.hideLoading();
          console.error('[login-modal] login failed:', err);
          wx.showToast({ title: '登录失败', icon: 'none' });
        });
    },

    onAvatarChoose(e) {
      const avatarUrl = e.detail.avatarUrl || '';
      if (!avatarUrl) return;
      this.setData({ avatarUrl });
      if (!isCloudReady()) {
        this.setData({ avatarFileID: avatarUrl });
        return;
      }
      wx.showLoading({ title: '上传头像中', mask: true });
      const app = getApp();
      const session = getSession();
      const openid = (app.globalData && app.globalData.openid) || (session && session.openid);
      if (!openid) {
        wx.hideLoading();
        wx.showToast({ title: '登录信息失效，请重新登录', icon: 'none' });
        this.setData({ avatarUrl: '', avatarFileID: '' });
        return;
      }
      const extMatch = avatarUrl.split('?')[0].match(/\.([a-zA-Z0-9]{1,4})$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
      uploadFile(avatarUrl, `avatars/${openid}.${ext}`)
        .then((fileID) => this.setData({ avatarFileID: fileID }))
        .catch((err) => {
          console.error('[login-modal] avatar upload failed:', err);
          wx.showToast({ title: '头像上传失败', icon: 'none' });
        })
        .finally(() => wx.hideLoading());
    },

    onNicknameInput(e) {
      this.setData({ nickname: e.detail.value || '' });
    },

    onSubmit() {
      const nickname = (this.data.nickname || '').trim();
      if (!nickname) {
        wx.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      if (this.data.submitting) return;
      this.setData({ submitting: true });
      updateUserProfile(nickname, this.data.avatarFileID)
        .then(() => {
          this.setData({ submitting: false });
          this.finishLogin();
        })
        .catch((err) => {
          this.setData({ submitting: false });
          console.error('[login-modal] save profile failed:', err);
          wx.showToast({ title: '保存失败', icon: 'none' });
        });
    },

    finishLogin() {
      const app = getApp();
      const session = getSession();
      if (session) {
        app.globalData.openid = session.openid;
        app.globalData.userInfo = session.profile;
      }
      this.setData({
        needSetup: false,
        avatarUrl: '',
        nickname: '',
        avatarFileID: '',
      });
      this.triggerEvent('logined');
    },
  },
});
