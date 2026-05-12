import { getMessageSummary, messages } from '~/mock/community';

Page({
  data: {
    messageList: messages,
    summaryCards: getMessageSummary(),
  },

  goDetail() {
    wx.navigateTo({
      url: '/pages/detail/index?id=1',
    });
  },
});
