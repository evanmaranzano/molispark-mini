Component({
  properties: {
    compact: { type: Boolean, value: false },
  },
  data: {
    height: 20,
  },
  lifetimes: {
    attached() {
      const app = getApp();
      const bar = (app && app.globalData && app.globalData.statusBarHeight) || 20;
      this.setData({ height: bar });
    },
  },
});
