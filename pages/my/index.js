import useToastBehavior from '~/behaviors/useToast';
import { myMenus, myServices, myStats, profile } from '~/mock/community';

Page({
  behaviors: [useToastBehavior],

  data: {
    profile,
    stats: myStats,
    menuList: myMenus,
    serviceList: myServices,
  },

  onMenuTap(e) {
    const { title, url } = e.currentTarget.dataset;
    const routeMap = {
      我的帖子: '/pages/myPosts/index',
      我的收藏: '/pages/favorites/index',
      浏览记录: '/pages/history/index',
      下载管理: '/pages/history/index',
    };
    const targetUrl = url || routeMap[title];
    if (targetUrl) {
      wx.navigateTo({ url: targetUrl });
      return;
    }
    this.onShowToast('#t-toast', title);
  },
});
