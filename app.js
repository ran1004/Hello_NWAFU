// 定义小程序的全局对象
App({
  // 小程序启动时调用的生命周期函数
  onLaunch: function () {
    // 从本地缓存中获取名为 'logs' 的数据，如果不存在则初始化为空数组
    var logs = wx.getStorageSync('logs') || []
    // 将当前时间戳添加到数组的开头
    logs.unshift(Date.now())
    // 将更新后的数组重新存储到本地缓存中
    wx.setStorageSync('logs', logs)
  },

  // 获取用户信息的方法
  getUserInfo: async function () {
    try {
      // 调用登录接口获取用户的登录凭证（code）
      await wx.login()
      // 调用封装好的 _getUserInfo 方法获取用户信息
      const res = await this._getUserInfo()
      // 将获取到的用户信息存储到全局变量 globalData.userInfo 中
      this.globalData.userInfo = res.userInfo
      // 返回用户信息
      return res.userInfo
    } catch (error) {
      // 如果获取用户信息失败，打印错误信息并抛出异常
      console.error('获取用户信息失败:', error)
      throw error
    }
  },

  // 封装 wx.getUserInfo 的方法，返回一个 Promise
  _getUserInfo: function () {
    return new Promise((resolve, reject) => {
      // 调用微信的 getUserInfo 方法
      wx.getUserInfo({
        success: resolve, // 获取成功时调用 resolve
        fail: reject // 获取失败时调用 reject
      })
    })
  },

  // 全局数据对象，用于存储小程序的全局数据
  globalData: {
    userId: 1 // 用于存储用户信息，初始值为 null
  }
})