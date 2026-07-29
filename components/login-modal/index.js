const {
  loginWithCloud,
  updateUserProfile,
  updateSessionProfile,
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

    // 手机号快速验证登录：button open-type="getPhoneNumber" 回调。
    // 先确保微信登录态（拿 openid），再把 code 交给 login 云函数换手机号。
    // 能力受限（个人主体/未开通）时云函数返回 PHONE_FAILED，降级提示走微信登录。
    onGetPhoneNumber(e) {
      const code = e && e.detail && e.detail.code;
      if (!code) {
        if (e && e.detail && e.detail.errMsg && e.detail.errMsg.indexOf('deny') === -1) {
          console.warn('[login-modal] getPhoneNumber failed:', e.detail.errMsg);
        }
        wx.showToast({ title: '未授权手机号', icon: 'none' });
        return;
      }
      if (!isCloudReady()) {
        wx.showToast({ title: '当前环境不支持手机号登录', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '登录中', mask: true });
      loginWithCloud(getDefaultProfile())
        .then((session) =>
          wx.cloud
            .callFunction({ name: 'login', data: { action: 'phone', code } })
            .then((res) => ({ session, result: res.result || {} }))
        )
        .then(({ session, result }) => {
          wx.hideLoading();
          if (!result.success || !result.phoneNumber) {
            console.error('[login-modal] phone login failed:', result.code, result.error || '');
            wx.showToast({ title: '手机号登录失败，请用微信登录', icon: 'none' });
            return;
          }
          const merged = updateSessionProfile({ phoneNumber: result.phoneNumber });
          const profile = merged ? merged.profile : session.profile;
          if (isProfileComplete(profile)) {
            this.finishLogin();
          } else {
            this.setData({ needSetup: true });
          }
        })
        .catch((err) => {
          wx.hideLoading();
          console.error('[login-modal] phone login error:', err);
          wx.showToast({ title: '手机号登录失败，请用微信登录', icon: 'none' });
        });
    },

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
