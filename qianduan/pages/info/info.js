// pages/info/info.js
Page({

    /**
     * 页面的初始数据
     */
    data: {
        user_name: '董嘉晨',
        avatarUrl: '/images/icon8.jpg'
    },
    goToProfile() {

        // 通过路由API跳转到个人信息页
        wx.navigateTo({
            url: '/pages/info/profile' // 你的个人信息页面路径
        })

    },
    // 新增数据加载方法
    loadUserProfile() {
        const savedData = wx.getStorageSync('userProfile')
        if (savedData) {
            this.setData({
                user_name: savedData.name,
                avatarUrl: savedData.avatarUrl || '/images/icon8.jpg'
            })
        }
        console.log('用户数据已更新')
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {

    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
  // 确保onShow时也更新
  onShow() {
    this.loadUserProfile()
  },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

    }
})