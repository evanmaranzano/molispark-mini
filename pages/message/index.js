import { getMessages, markMessageRead } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { messages as mockMessages } from '~/mock/community';
import loginGuard from '~/behaviors/loginGuard';

const { formatTime } = require('~/utils/time');

Page({
  behaviors: [loginGuard],
  data: {
    messageList: [],
    summaryCards: [],
    loading: true,
    loadError: false,
  },

  onShow() {
    if (this.checkLoginGuard()) this.loadMessages();
    else this.setData({ loading: false, messageList: [], summaryCards: this.buildSummary(0, 0) });
  },

  onLoginGuardPassed() {
    this.loadMessages();
  },

  onLogined() {
    this.setData({ showLoginModal: false });
    this.loadMessages();
  },

  onLoginModalClose() {
    this.setData({ showLoginModal: false, loading: false });
  },

  async loadMessages() {
    const app = getApp();
    const { openid } = app.globalData;
    if (!openid) {
      this.setData({ messageList: [], summaryCards: this.buildSummary(0, 0), loading: false });
      return;
    }

    const result = await withMockFallback(
      () => getMessages(openid),
      () => mockMessages
    );
    if (result && result.__loadError) {
      this.setData({
        messageList: [],
        summaryCards: this.buildSummary(0, 0),
        loading: false,
        loadError: true,
      });
      return;
    }
    const messages = Array.isArray(result) ? result : [];
    const messageList = messages.map((item) => {
      const read = item.read === undefined ? !(item.unreadCount > 0) : item.read;
      return {
        ...item,
        read,
        avatarText: item.avatarText || (item.fromName ? item.fromName.slice(0, 1) : '消'),
        timeText: formatTime(item.createdAt) || item.time,
        statusText: read ? '已读完' : '未读',
        showBadge: !read,
      };
    });
    const unreadTotal = messageList.filter((item) => !item.read).length;
    this.setData({
      messageList,
      summaryCards: this.buildSummary(unreadTotal, messageList.length),
      loading: false,
      loadError: false,
    });
  },

  buildSummary(unread, total) {
    return [
      { label: '未读', value: String(unread).padStart(2, '0') },
      { label: '会话数', value: String(total).padStart(2, '0') },
    ];
  },

  retryLoad() {
    this.setData({ loadError: false, loading: true });
    this.loadMessages();
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
