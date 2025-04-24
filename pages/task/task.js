//answer.js
var util = require('../../utils/util.js')

var app = getApp()
Page({
  data: {
    motto: '',
    userInfo: {}
  },
  //事件处理函数
  toQuestion: function() {
    wx.navigateTo({
      url: ''
    })
  },
  onLoad: function () {
    console.log('onLoad')
    var that = this
    //调用应用实例的方法获取全局数据
    app.getUserInfo(function(userInfo){
      //更新数据
      that.setData({
        userInfo:userInfo
      })
    })
  },
  tapName: function(event){
    console.log(event)
  },

  bindTimeChange(e) {
    const index = e.detail.value
    this.setData({
      selectedIndex: index,
      selectedMinute: parseInt(this.data.minutesList[index])
    })
  },

  navigateToClockPage() {
// 假设在上个页面的跳转逻辑中
wx.navigateTo({
    url: `/pages/check/check?activity=${encodeURIComponent(JSON.stringify({
      id: 123,
      title: '每日健康打卡',
      startTime: '2023-10-01',
      timeLimit:'',
      deadline: '2023-10-31'
    }))}`
  })
  }
})