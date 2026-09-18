const auth = require('./utils/auth');

App({
  globalData: {
    userInfo: null,
    openid: '',
    cloudReady: false,
    statusBarHeight: 0,
    capsuleTop: 0,
    // 胶囊（小药丸）菜单安全区：右上角可点元素需右移这么多 rpx 才不会被系统胶囊盖住
    capsuleInsetRpx: 0,
  },

  onLaunch() {
    this.initSystemInfo();
    this.initCloud();
    this.checkUpdate();
    this.restoreSession();
  },

  initSystemInfo() {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.globalData.statusBarHeight = info.statusBarHeight || 20;
      const capsule = wx.getMenuButtonBoundingClientRect();
      this.globalData.capsuleTop = capsule.top;
      // 胶囊左缘距屏幕右缘的宽度（含系统右边距），换算 rpx 后再加 8px 间隙
      const windowWidth = info.windowWidth || 375;
      const insetPx = Math.max(windowWidth - capsule.left, 0) + 8;
      this.globalData.capsuleInsetRpx = Math.round((insetPx * 750) / windowWidth);
    } catch (e) {
      this.globalData.statusBarHeight = 20;
    }
  },

  initCloud() {
    if (!wx.cloud) {
      console.warn('请使用 2.2.3 及以上基础库以支持云开发能力');
      return;
    }

    const envId = 'cloud1-d6g0v8u009ac081c2';
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
    if (!session) return;
    // openid 是登录凭证，与资料是否完整解耦：未填昵称的登录用户也应能查自己的点赞/收藏状态、
    // 在云函数里写入 _openid。否则 profile 不完整时 globalData.openid 丢失，detail 页
    // checkInteractionState 直接 return，状态永远不回显。
    this.globalData.openid = session.openid;
    if (auth.isProfileComplete(session.profile)) {
      this.globalData.userInfo = session.profile;
    }
  },
});
