const { getSession, isProfileComplete } = require('~/utils/auth');

// 登录守卫：浏览不强制；写操作调 requireLogin() 才弹登录。
// 个人页（消息 / 我的 / 草稿等）可在 onShow 调 checkLoginGuard()，弹窗必须可关闭。
// 配合 <login-modal show="{{showLoginModal}}" bind:logined="onLogined" bind:close="onLoginModalClose" /> 使用
module.exports = Behavior({
  data: {
    showLoginModal: false,
  },

  methods: {
    isLoggedIn() {
      const session = getSession();
      return isProfileComplete(session ? session.profile : null);
    },

    checkLoginGuard() {
      const ok = this.isLoggedIn();
      this.setData({ showLoginModal: !ok });
      return ok;
    },

    requireLogin() {
      const ok = this.isLoggedIn();
      if (!ok) this.setData({ showLoginModal: true });
      return ok;
    },

    onLogined() {
      this.setData({ showLoginModal: false });
      if (typeof this.onLoginGuardPassed === 'function') {
        this.onLoginGuardPassed();
      }
    },

    onLoginModalClose() {
      this.setData({ showLoginModal: false });
    },
  },
});
