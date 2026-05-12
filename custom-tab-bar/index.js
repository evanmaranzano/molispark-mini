Component({
  data: {
    value: '',
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
    ready() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        const nameRe = /pages\/([^/]+)\/index/.exec(curPage.route);
        if (!nameRe) return;
        if (nameRe[1]) {
          this.setData({
            value: nameRe[1],
          });
        }
      }
    },
  },
  methods: {
    handleChange(e) {
      const { value, path } = e.currentTarget.dataset;
      this.setData({ value });
      wx.switchTab({ url: path });
    },
  },
});
