const auth = require('./utils/auth');

App({
  globalData: {
    userInfo: null,
    openid: '',
    cloudReady: false,
  },

  onLaunch() {
    this.initCloud();
    this.checkUpdate();
    this.restoreSession();
  },

  initCloud() {
    if (!wx.cloud) {
      console.warn('请使用 2.2.3 及以上基础库以支持云开发能力');
      return;
    }

    const envId = 'your-cloud-env-id';
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
  },

  restoreSession() {
    const session = auth.getSession();
    if (session) {
      this.globalData.openid = session.openid;
      this.globalData.userInfo = session.profile;
    }
  },
});
