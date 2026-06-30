Component({
  data: {
    value: '',
    hidden: false,
    list: [
      {
        icon: 'home',
        value: 'home',
        label: '首页',
        path: '/pages/home/index',
      },
      {
        icon: 'add',
        value: 'release',
        label: '发布',
        path: '/pages/release/index',
        isAction: true,
      },
      {
        icon: 'user',
        value: 'my',
        label: '我的',
        path: '/pages/my/index',
      },
    ],
  },
  lifetimes: {
    attached() {
      this.syncActiveTab();
    },
  },
  methods: {
    // 每个 tab 页 onShow 调用 this.getTabBar().syncActiveTab() 同步高亮。
    // 不依赖 pageLifetimes.show（部分基础库对 custom-tab-bar 不可靠），
    // 由页面主动驱动，行为可控。
    syncActiveTab() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (!curPage) return;
      const nameRe = /pages\/([^/]+)\/index/.exec(curPage.route);
      if (nameRe && nameRe[1]) {
        this.setData({ value: nameRe[1] });
      }
    },
    handleChange(e) {
      const { value, path } = e.currentTarget.dataset;
      this.setData({ value });
      wx.switchTab({ url: path });
    },
  },
});
