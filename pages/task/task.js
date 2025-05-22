//answer.js
var util = require('../../utils/util.js')
var app = getApp()


Page({
  data: {
    id: null,
    basicInfo: {},  // 从列表页接收的预加载数据
    detailInfo: {}, // 从后端获取的完整数据
    loading: true
  },
  onLoad(options) {
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('acceptActivityData', (basicInfo) => {
      this.setData({
        id:basicInfo.id,
        basicInfo: {  // 直接设置整个对象
          cover_url: basicInfo.cover_url,
          end_time: basicInfo.end_time,
          formatted_end_time: basicInfo.formatted_end_time,
          formatted_start_time: basicInfo.formatted_start_time,
          id: basicInfo.id,
          location_name: basicInfo.location_name,
          start_time: basicInfo.start_time,
          status: basicInfo.status,
          title: basicInfo.title
        },  
        loading: false
      });
    });
    // 仍然保留从后端获取完整数据的逻辑
    this.fetchActivityDetail(options.id); 
  },

  fetchActivityDetail(id) {
    wx.showLoading({ title: '加载中...', mask: true }); // 添加加载提示
    wx.request({
      url: `${app.globalData.AUTH_API}activities/${id}`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}` // 添加认证头
      },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          console.log('----------成功拿到完整内容---------')
          this.setData({
            detailInfo: res.data, // 根据实际API结构调整
            loading: false
          });
        } else {
          this.handleErrorResponse(res);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        this.handleNetworkError(err);
      }
    });
  },
  
  // 新增错误处理方法
  handleErrorResponse(res) {
    const errorMap = {
      401: '请先登录',
      403: '没有访问权限',
      404: '活动不存在',
      500: '服务端错误'
    };
    wx.showToast({
      title: errorMap[res.statusCode] || `加载失败（${res.statusCode}）`,
      icon: 'none',
      duration: 2000
    });
  },
  
  // 新增网络错误处理
  handleNetworkError(err) {
    console.error('API请求失败:', err);
    wx.showToast({
      title: '网络连接失败',
      icon: 'none',
      duration: 2000
    });
  },

  //跳转打卡
  navigateToClockPage() {
    const { basicInfo, id } = this.data;
    wx.navigateTo({
        url: `/pages/check/check?activity=${encodeURIComponent(JSON.stringify({
          id,
          title: basicInfo.title,
          startTime: basicInfo.start_time,
          timeLimit: '',
          deadline: basicInfo.end_time
        }))}`
      })
  }

})