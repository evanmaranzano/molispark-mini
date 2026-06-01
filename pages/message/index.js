import { getMessages, markMessageRead, count } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { messages as mockMessages, getMessageSummary } from '~/mock/community';

Page({
  data: {
    messageList: [],
    summaryCards: [],
    loading: true,
  },

  onShow() {
    this.loadMessages();
  },

  async loadMessages() {
    const app = getApp();
    const { openid } = app.globalData;
    if (!openid) {
      // 未登录，降级到 mock
      const list = mockMessages.map((item) => ({
        ...item,
        fromName: item.name,
        avatarText: item.avatarText,
        statusText: item.unreadCount > 0 ? '未读' : '已读完',
        showBadge: item.unreadCount > 0,
      }));
      this.setData({ messageList: list, summaryCards: getMessageSummary(), loading: false });
      return;
    }
    const renderMock = () => {
      // 降级到 mock
      const list = mockMessages.map((item) => ({
        ...item,
        fromName: item.name,
        avatarText: item.avatarText,
        statusText: item.unreadCount > 0 ? '未读' : '已读完',
        showBadge: item.unreadCount > 0,
      }));
      this.setData({ messageList: list, summaryCards: getMessageSummary(), loading: false });
    };

    try {
      const messages = await getMessages(openid);
      if (!messages.length) {
        renderMock();
        return;
      }
      const unreadTotal = messages.filter((item) => !item.read).length;
      const messageList = messages.map((item) => ({
        ...item,
        avatarText: item.avatarText || (item.fromName ? item.fromName.slice(0, 1) : '消'),
        statusText: item.read ? '已读完' : '未读',
        showBadge: !item.read,
      }));
      this.setData({
        messageList,
        summaryCards: this.buildSummary(unreadTotal, messages.length),
        loading: false,
      });
    } catch (err) {
      renderMock();
    }
  },

  buildSummary(unread, total) {
    return [
      { label: '未读', value: String(unread).padStart(2, '0') },
      { label: '会话数', value: String(total).padStart(2, '0') },
    ];
  },

  async goDetail(e) {
    const { id, msgId } = e.currentTarget.dataset;
    if (msgId) {
      try {
        await markMessageRead(msgId);
      } catch (err) {
        // 静默失败
      }
    }
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },
});
