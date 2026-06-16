const { getSession, isProfileComplete } = require('~/utils/auth');

// 登录守卫 behavior：页面 onShow 调 checkLoginGuard()，未完善资料则弹出登录面板
// 配合 <login-modal show="{{showLoginModal}}" bind:logined="onLogined" /> 使用
module.exports = Behavior({
  data: {
    showLoginModal: false,
  },

  methods: {
    checkLoginGuard() {
      const session = getSession();
      const ok = isProfileComplete(session ? session.profile : null);
      this.setData({ showLoginModal: !ok });
      return ok;
    },

    onLogined() {
      this.setData({ showLoginModal: false });
    },
  },
});
