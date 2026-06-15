/**
 * 云开发状态检查（统一入口）
 */
function isCloudReady() {
  try {
    const app = getApp();
    return Boolean(wx.cloud && app && app.globalData && app.globalData.cloudReady);
  } catch (err) {
    return false;
  }
}

module.exports = { isCloudReady };
