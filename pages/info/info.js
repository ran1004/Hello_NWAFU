// pages/info/info.js

const app = getApp();

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
        console.log("保存的数据", savedData)
        if (savedData) {
            this.setData({
                user_name: savedData.userInfo.name,
                avatarUrl: savedData.currentLocalAvatarUrl || '/images/icon8.jpg'
            })
        }
        console.log('用户数据已更新')
    },
    // 新增“查看打卡情况”按钮绑定方法，暂不用，为空
    showPopup(){
    },
    // 新增“导出指定活动id打卡情况”按钮绑定方法
    get_single_csv(event){
    // 获取自定义数据属性 actid ,由按钮传入
    const actid = event.currentTarget.dataset.actid;
    //获取用户token
      const token = wx.getStorageSync('auth_token');
      this.setData({
          auth_token: token
      })
      console.log("Token:", this.data.auth_token)

      wx.request({
        url: `${app.globalData.AUTH_API}checkins/print_check`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${this.data.auth_token}`,
          'Content-Type': 'application/json'
          },
        data: {
          actid: actid
        },
          success(res) {
            if (res.statusCode === 200) {
              console.log('后端返回的打卡记录:', res.data);
              wx.getFileSystemManager().saveFile({
                tempFilePath: res.tempFilePath,
                success(savedRes) {
                  wx.openDocument({
                    filePath: savedRes.savedFilePath,
                    fileType: 'xlsx',
                    success() {
                      wx.showToast({ title: '导出成功' });
                    },
                    fail() {
                      wx.showToast({ title: '无法打开文件', icon: 'none' });
                    }
                  });
                },
                fail(savedRes) {
                  wx.showToast({ title: '无法下载文件', icon: 'none' });
                }
              });
            }
            else{
              wx.showToast({ title: '没有权限查看活动记录', icon: 'none' });
            }
        }
      })
    },
    // 新增“导出指定活动类型打卡情况”按钮绑定方法
    get_acclass1_csv(event){
      // 获取自定义数据属性 actid
    const actid = event.currentTarget.dataset.actid;
    //获取用户token
      const token = wx.getStorageSync('auth_token');
      this.setData({
          auth_token: token
      })
      console.log("Token:", this.data.auth_token)

      wx.request({
        url: `${app.globalData.AUTH_API}checkins/print_class1check`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${this.data.auth_token}`,
          'Content-Type': 'application/json'
          },
        data: {
          actClass: 1
        },
          success(res) {
            if (res.statusCode === 200) {
              console.log('后端返回的打卡记录:', res.data);
              wx.getFileSystemManager().saveFile({
                tempFilePath: res.tempFilePath,
                success(savedRes) {
                  wx.openDocument({
                    filePath: savedRes.savedFilePath,
                    fileType: 'xlsx',
                    success() {
                      wx.showToast({ title: '导出成功' });
                    },
                    fail() {
                      wx.showToast({ title: '无法打开文件', icon: 'none' });
                    }
                  });
                },
                fail(savedRes) {
                  wx.showToast({ title: '无法下载文件', icon: 'none' });
                }
              });
            }
            else{
              wx.showToast({ title: '没有权限查看活动记录', icon: 'none' });
            }
        }
      })
    },
    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        this.loadUserProfile()
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