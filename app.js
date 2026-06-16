const auth = require('./utils/auth');

App({
  globalData: {
    userInfo: null,
    openid: '',
    cloudReady: false,
    statusBarHeight: 0,
    capsuleTop: 0,
  },

  onLaunch() {
    this.initSystemInfo();
    this.initCloud();
    this.checkUpdate();
    this.restoreSession();
    this.setupLoginGuard();
  },

  initSystemInfo() {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.globalData.statusBarHeight = info.statusBarHeight || 20;
      const capsule = wx.getMenuButtonBoundingClientRect();
      this.globalData.capsuleTop = capsule.top;
    } catch (e) {
      this.globalData.statusBarHeight = 20;
    }
  },

  initCloud() {
    if (!wx.cloud) {
      console.warn('请使用 2.2.3 及以上基础库以支持云开发能力');
      return;
    }

    const envId = 'cloud1-d4gtpsssef2dcbcf8';
    if (!envId || envId === 'your-cloud-env-id') {
      console.warn('请先在 app.js 中替换微信云开发环境 ID');
      return;
    }

    wx.cloud.init({
      env: envId,
      traceUser: true,
    });
    this.globalData.cloudReady = true;
  },

  checkUpdate() {
    const updateManager = wx.getUpdateManager();
    updateManager.onCheckForUpdate(() => {});
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        },
      });
    });
    updateManager.onUpdateFailed(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本下载失败，请检查网络后重试',
        showCancel: false,
      });
    });
  },

  restoreSession() {
    const session = auth.getSession();
    if (session && auth.isProfileComplete(session.profile)) {
      this.globalData.openid = session.openid;
      this.globalData.userInfo = session.profile;
    }
  },

  // 全局登录守卫：未完善资料时，除「我的」页外一律拦截跳转登录，避免未登录操作
  setupLoginGuard() {
    const ALLOWED = ['pages/my/index'];
    const guard = (path) => {
      const cleanPath = (path || '').split('?')[0];
      if (ALLOWED.some((p) => cleanPath.indexOf(p) === 0)) return;
      const session = auth.getSession();
      if (auth.isProfileComplete(session ? session.profile : null)) return;
      if (!this._loginGuardPrompting) {
        this._loginGuardPrompting = true;
        wx.showModal({
          title: '请先登录',
          content: '完善昵称和头像后即可使用全部功能',
          showCancel: false,
          complete: () => { this._loginGuardPrompting = false; },
        });
      }
      wx.switchTab({ url: '/pages/my/index' });
    };
    wx.onAppRoute((res) => guard(res.path));
  },
});
