// pages/check/check.js
Page({

    /**
     * 页面的初始数据
     */
    data: {
        bgImage: "/images/background/bg1.jpeg",
        photoPath: null, // 存储拍摄的照片路径
        countdownTime: '00:00:00',
        isExpired: false, //是否超时
        endTime: 0,
        locationInfo: null, //地理位置信息
        errorMsg: '', //错误信息
        hasPhoto: false, // 拍照状态
        hasLocat: false //定位状态
    },
    // 拍照处理函数
    handleTakePhoto() {
        const that = this
        // 第一步：检查授权状态
        wx.getSetting({
            success(res) {
                if (!res.authSetting['scope.camera']) {
                    // 第二步：未授权时请求授权
                    wx.authorize({
                        scope: 'scope.camera',
                        success() {
                            that.takePhoto()
                        },
                        fail() {
                            // 第三步：授权拒绝后的处理
                            wx.showModal({
                                title: '权限提示',
                                content: '需要相机权限才能拍照，是否去设置打开？',
                                success(res) {
                                    if (res.confirm) {
                                        wx.openSetting()
                                    }
                                }
                            })
                        }
                    })
                } else {
                    that.takePhoto()
                }
            }
        })
    },
    // 执行拍照操作
    takePhoto() {
        wx.showLoading({
            title: '拍照中...'
        })
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['camera'],
            camera: 'back',
            success: (res) => {
                this.setData({
                    photoPath: res.tempFiles[0].tempFilePath,
                    hasPhoto:true
                })
                console.log(this.data.hasPhoto);
                // 这里可以添加照片上传逻辑
                wx.showToast({
                    title: '拍摄成功!'
                })
            },
            fail: (err) => {
                console.error('拍照失败:', err)
                wx.showToast({
                    title: '拍照失败',
                    icon: 'none'
                })
            },
            complete: () => {
                wx.hideLoading()
            }
        })
    },


    startCountdown() {
        //1s刷新一次界面
        this.timer = setInterval(() => {
            const remain = this.data.endTime - Date.now()

            if (remain <= 0) {
                //倒计时结束
                this.handleTimeout()
                return
            }
            //计算剩余时分秒
            const hours = Math.floor(remain / (1000 * 60 * 60))
            const minutes = Math.floor((remain % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((remain % (1000 * 60)) / 1000)

            this.setData({
                countdownTime: [hours, minutes, seconds]
                    .map(n => n.toString().padStart(2, '0'))
                    .join(':'),
                isExpired: false
            })
        }, 1000)
    },
    handleTimeout() {
        clearInterval(this.timer) //清除定时器
        this.setData({
            countdownTime: '00:00:00',
            isExpired: true //设置状态为超时
        })
    },

 
    // 核心定位方法
    async getLocation() {

        //重新获取位置信息
        this.clearData();
        this.setData({
            locationInfo: {
                refreshing: false
            }
        }) // 开始加载

        // 1. 检查用户是否已授权
        const {
            authSetting
        } = await wx.getSetting();
        if (!authSetting['scope.userLocation']) {
            try {
                await wx.authorize({
                    scope: 'scope.userLocation'
                });
            } catch (authError) {
                wx.showModal({
                    title: '权限提示',
                    content: '需要位置权限以获取定位，请前往设置开启',
                    success: (res) => {
                        if (res.confirm) wx.openSetting();
                    }
                });
                return;
            }
        }

        // 2. 获取定位
        try {
            const {
                latitude,
                longitude
            } = await this.getDeviceLocation();
            console.log(latitude, longitude);
            this.setData({
                locationInfo: {
                    latitude,
                    longitude,
                }
            }, () => {
                console.log('数据更新成功:', this.data.locationInfo);
            });
            //3.获取腾讯位置服务进行逆地理位置解析
            const address = await this.reverseGeocoder(latitude, longitude);
        } catch (error) {
            console.error('定位失败:', error);
            this.setData({
                errorMsg: '获取定位失败，请检查GPS或重试'
            });
        }

    },
    // 调用腾讯逆地理编码API
    /**
     * 仅仅在测试环境中使用
     * 正式上线应该安全域名设置
     * 在小程序管理后台 -> 开发 -> 开发管理 -> 开发设置 -> “服务器域名” 中
     * 设置request合法域名，添加https://apis.map.qq.com
     */
    reverseGeocoder(latitude, longitude) {
        console.log("kaishi");
        const key = 'LP7BZ-EDC63-F6X3B-ORROQ-RJEXJ-ODB5P'; // 替换为你的Key
        const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=${key}`;
        console.log("生成的URL:" + url);
        const that = this; // 保存Page实例的引用
        wx.request({
            url: url,
            success(res) {
                if (res.data.status === 0) {
                    const address = res.data.result.address;
                    console.log(res);
                    console.log(address);
                    that.setData({
                        hasLocat:true,
                        locationInfo: {
                            latitude,
                            longitude,
                            refreshing: false,
                            address: address
                        }
                    }, () => {
                        console.log(that.data.hasPhoto);
                        console.log('定位成功:', that.data.locationInfo);
                    });
                } else {
                    console.error("逆地理编码失败：", res.data.message);
                }
            },
            fail(err) {
                console.error("请求失败：", err);
                that.setData({
                    locationInfo: {
                        refreshing: false
                    }
                })
            }
        });
    },
    getDeviceLocation() {
        return new Promise((resolve, reject) => {
            wx.getLocation({
                type: 'wgs84',
                success: resolve,
                fail: reject
            });
        });
    },

    clearData() {
        this.setData({
            locationInfo: null,
            errorMsg: ''
        });
    },

    // 刷新定位方法
    refreshLocation() {
        if (!this.data.location.refreshing) { // 防止重复点击
            this.setData({
                location: {
                    ...this.data.location,
                    refreshing: true
                }
            })
            this.getLocation() // 重新获取定位
        }
    },
    //提交按钮绑定事件
    handleSubmit() {
        if (this.data.isExpired) {
            wx.showToast({
                title: '已超过打卡时间',
                icon: 'none',
                duration: 2000
            })
            return
        }
        console.log(this.data.hasPhoto);
        if(!this.data.hasPhoto){
            wx.showToast({
                title: '未进行拍照',
                icon: 'none',
                duration: 2000
            })
            return
        }
        if(!this.data.hasLocat){
            wx.showToast({
                title: '未进行定位',
                icon: 'none',
                duration: 2000
            })
            return
        }
        // 正常提交逻辑
        wx.showToast({
            title: '打卡成功！',
            icon: 'success'
        })
        //在提交完毕之后应该上传服务器存储到数据库中并跳转回首页
        wx.switchTab({
          url: '/pages/activity/activity',
        })
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        //加载上个页面传递的数据
        const minutes = parseInt(options.minutes) || 10
        const endTime = Date.now() + minutes * 60 * 1000
        this.setData({
            endTime
        }, () => {
            this.startCountdown()
        })
    },
    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

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
        clearInterval(this.timer)
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