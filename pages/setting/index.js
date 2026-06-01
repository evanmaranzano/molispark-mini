const SETTINGS_KEY = 'appSettings';

const DEFAULT_VALUES = {
  通用设置: '标准',
  通知设置: '已开启',
  深色模式: '已关闭',
  字体大小: '标准',
  播放设置: '自动播放',
  账号安全: '保护中',
  隐私: '仅自己可见',
};

const TOGGLE_MAP = {
  通知设置: ['已开启', '已关闭'],
  深色模式: ['已关闭', '已开启'],
  字体大小: ['标准', '大号'],
  播放设置: ['自动播放', '手动播放'],
  隐私: ['仅自己可见', '公开资料'],
  通用设置: ['标准', '精简'],
  账号安全: ['保护中', '建议检查'],
};

Page({
  data: {
    groups: [
      ['通用设置', '通知设置'],
      ['深色模式', '字体大小', '播放设置'],
      ['账号安全', '隐私'],
    ],
    values: { ...DEFAULT_VALUES },
  },

  onLoad() {
    const saved = wx.getStorageSync(SETTINGS_KEY);
    if (saved) {
      this.setData({ values: { ...DEFAULT_VALUES, ...saved } });
    }
  },

  navigateBack() {
    wx.navigateBack();
  },

  handleTap(e) {
    const { title } = e.currentTarget.dataset;
    const { values } = this.data;
    const options = TOGGLE_MAP[title];
    if (!options) return;
    const nextValues = { ...values };
    nextValues[title] = values[title] === options[0] ? options[1] : options[0];
    this.setData({ values: nextValues });
    wx.setStorageSync(SETTINGS_KEY, nextValues);
    wx.showToast({ title: `${title}已更新`, icon: 'none' });
  },
});
