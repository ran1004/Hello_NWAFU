//index.js

// 引入工具模块 util.js，通常用于封装一些通用的工具函数


var util = require('../../utils/util.js')
// 获取全局应用实例，用于访问全局数据或方法
var app = getApp()

Page({
  data: {
    feed: [], // 用于存储首页的动态数据
    feed_length: 0 // 动态数据的长度
  },
   // 页面加载时触发的生命周期函数
   onLoad: function () {
    console.log('onLoad11111111') // 打印日志，表示页面加载
    var that = this // 保存 this 的引用，用于闭包中访问页面对象
    // 调用应用实例的方法获取全局数据
    this.getData()
  },


  // 事件处理函数：处理动态项的点击事件
  bindTaskTap: function() {
    // 导航到回答页面
    wx.navigateTo({
      url: '../task/task'
    })
  },
  bindUserTap: function() {
    // 导航到回答页面
    wx.navigateTo({
      url: '../user/user'
    })
  },

  upper: function() {
    console.log('滚动到顶部');
  
  },
  lower: function() {
    console.log('滚动到底部');
    
  },
  
  lightning: function(){
    console.log('闪电');
  },
  // scrollToItem: function() {
  //   this.setData({
  //     toView: 'item3' // 滚动到 id 为 "item3" 的元素
  //   });
  // },
  // scrollToTop: function() {
  //   this.setData({
  //     scrollTop: 100 // 滚动到距离顶部 100px 的位置
  //   });
  // }

  // 网络请求数据，实现首页刷新（未使用）
  refresh0: function(){
    var index_api = '' // 定义接口地址（此处为空，未使用）
    util.getData(index_api) // 调用工具模块的 getData 方法请求数据
        .then(function(data){
          // this.setData({ // 设置数据到页面（此处未使用）
          // });
          console.log(data) // 打印请求返回的数据
        })
  },

  // 使用本地 fake 数据实现刷新效果s
  getData: function(){
    var feed = util.getData2() // 调用工具模块的 getData2 方法获取本地模拟数据
    console.log("loaddata") // 打印日志
    var feed_data = feed.data // 获取数据部分
    this.setData({ // 设置数据到页面
      feed: feed_data, // 更新动态数据
      feed_length: feed_data.length // 更新动态数据长度
    })
  },
  // 刷新函数
  refresh: function(){
    // 显示加载提示
    wx.showToast({
      title: '刷新中', // 提示内容
      icon: 'loading', // 加载图标
      duration: 3000 // 持续时间
    })
    var feed = util.getData2() // 获取本地模拟数据
    console.log("loaddata") // 打印日志
    var feed_data = feed.data // 获取数据部分
    this.setData({ // 更新页面数据
      feed: feed_data,
      feed_length: feed_data.length
    })
    // 设置定时器，3秒后显示刷新成功的提示
    setTimeout(function(){
      wx.showToast({
        title: '刷新成功', // 提示内容
        icon: 'success', // 成功图标
        duration: 2000 // 持续时间
      })
    },3000)
  },

  // 使用本地 fake 数据实现继续加载效果
  nextLoad: function(){
    // 显示加载提示
    wx.showToast({
      title: '加载中', // 提示内容
      icon: 'loading', // 加载图标
      duration: 4000 // 持续时间
    })
    var next = util.getNext() // 获取本地模拟的下一页数据
    console.log("continueload") // 打印日志
    var next_data = next.data // 获取数据部分
    this.setData({ // 更新页面数据
      feed: this.data.feed.concat(next_data), // 将新数据追加到现有数据中
      feed_length: this.data.feed_length + next_data.length // 更新数据长度
    })
    // 设置定时器，3秒后显示加载成功的提示
    setTimeout(function(){
      wx.showToast({
        title: '加载成功', // 提示内容
        icon: 'success', // 成功图标
        duration: 2000 // 持续时间
      })
    },3000)
  },
  handleMoreTap: function() {
    // 在这里处理点击事件
    console.log('...被点击了');
    // 您可以添加更多的逻辑，例如导航到另一个页面，或者触发一个事件
  }
})
