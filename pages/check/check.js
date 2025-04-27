// pages/check/check.js
// 工具函数：将 wx API 转为 Promise----封装成API
const promisify = (fn) => (options) => {
    return new Promise((resolve, reject) => {
        fn({
            ...options,
            success: (res) => resolve(res),
            fail: (err) => reject(err),
        });
    });
};
const request = promisify(wx.request); //封装request

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
        hasLocat: false, //定位状态
        // 新增活动信息字段 -----------start-----------
        activityInfo: {
            title: '每日健康打卡',
            id: 1,
        },
        //用户信息
        auth_token: null, //去后端获取Openid
        checkRecord: null, // 新增打卡记录字段
        // 新增活动信息字段 -----------end-----------
        isSubmitting: false // 新增字段
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
                    hasPhoto: true
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
                    const address = res.data.result.formatted_addresses.recommend;
                    console.log(res);
                    console.log(address);
                    that.setData({
                        hasLocat: true,
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
                type: 'gcj02', //火星坐标系与腾讯地图API保证一致
                altitude: true, // 获取高度信息（可选）
                isHighAccuracy: true, // 启用高精度
                highAccuracyExpireTime: 4000, // 高精度定位超时时间
                success: (res) => {
                    console.log("高精度定位成功")
                    resolve(res);
                },
                fail: (err) => {
                    // 高精度失败后尝试普通精度
                    console.error('高精度定位失败，尝试普通模式:', err);
                    wx.getLocation({
                        type: 'gcj02',
                        success: resolve,
                        fail: reject
                    });
                    //34.290907,108.074205
                }
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
    // 新增图片上传函数
    async uploadPhoto() {
        try {
            wx.showLoading({
                title: '上传图片中...'
            });
            const activityId = this.data.activityInfo.id; 
            console.log("活动ID")
            console.log(activityId)
            const uploadRes = await promisify(wx.uploadFile)({
                url: 'http://127.0.0.1:8000/upload-photo/',
                filePath: this.data.photoPath,
                name: 'photo',
                formData: {
                    activity_id: activityId  // [!] 新增表单字段
                  },
                header: {
                    'Authorization': `Bearer ${this.data.auth_token}`
                }
            });
            if (uploadRes.statusCode !== 200) {
                const responseData = JSON.parse(uploadRes.data);
                if (!responseData.data?.photo_url) {
                    throw new Error('图片上传失败');
                }
            }
            return JSON.parse(uploadRes.data).data.photo_url;
        } catch (error) {
            wx.showToast({
                title: error.message,
                icon: 'none'
            });
            throw error; // 继续抛出错误以阻断提交流程
        } finally {
            wx.hideLoading();
        }
    },
    // 提交按钮绑定事件（完整修改版）
    async handleSubmit() {
        if (this.data.isSubmitting) return;
        this.setData({
            isSubmitting: true
        });
        console.log("开始提交打卡记录");
        try {
            // 基础校验 -----------start----------
            if (this.data.isExpired) {
                wx.showToast({
                    title: '已超过打卡时间',
                    icon: 'none'
                });
                return;
            }
            if (!this.data.hasPhoto) {
                wx.showToast({
                    title: '请先拍摄照片',
                    icon: 'none'
                });
                return;
            }
            if (!this.data.hasLocat) {
                wx.showToast({
                    title: '请获取定位信息',
                    icon: 'none'
                });
                return;
            }

            // 显示加载状态
            wx.showLoading({
                title: '提交中...',
                mask: true
            });

            // 1. 上传图片
            const photoUrl = await this.uploadPhoto();
            console.log("图片上传成功！！")
            // 构建提交数据 -----------start----------
            const postData = {
                activity: {
                    id: this.data.activityInfo.id, // 确保传递数字类型ID
                    title: this.data.activityInfo.title
                },
                record: {
                    // photo_url: uploadRes.data.url, // 使用服务器返回的URL
                    // photo_url: this.data.photoPath,
                    photo_url: photoUrl, // [!] 关键修改：使用上传后的URL
                    latitude: this.data.locationInfo.latitude,
                    longitude: this.data.locationInfo.longitude,
                    address: this.data.locationInfo.address,
                    timestamp: new Date().toISOString() // 替换原来的Date.now()
                }
            };
            // -----------end----------

            // 提交打卡记录 -----------start----------
            const submitRes = await request({
                url: 'http://127.0.0.1:8000/checkins/submit-check',
                method: 'POST',
                header: {
                    'Authorization': `Bearer ${this.data.auth_token}`,
                    'Content-Type': 'application/json'
                },
                data: postData
            });
            console.log(submitRes.data)
            // 处理响应 -----------start----------
            if (submitRes.statusCode === 201) {
                wx.showToast({
                    title: '打卡成功！',
                    icon: 'success',
                    duration: 2000
                });
                setTimeout(() => {
                    wx.switchTab({
                        url: '/pages/index/index'
                    });
                }, 1500);
            } else {
                throw new Error(submitRes.data.message || '提交失败');
            }
            // -----------end----------
        } catch (error) {
            console.error('提交失败:', error);
            wx.showToast({
                title: error.message || '网络错误',
                icon: 'none',
                duration: 3000
            });
        } finally {
            this.setData({
                isSubmitting: false
            });
            wx.hideLoading();
        }
    },

    /**
     * 生命周期函数--监听页面加载
     */
    async onLoad(options) {
        //1.获取用户token
        const token = wx.getStorageSync('auth_token');
        this.setData({
            auth_token: token
        })
        console.log("Token:", this.data.auth_token)
        //2.加载活动数据
        // -------------新增参数接收处理---------
        try {
            // 解析参数中的活动信息（参数可能需要解码）
            const activity = JSON.parse(decodeURIComponent(options.activity))
            this.setData({
                'activityInfo': activity
            })
        } catch (e) {
            console.error('活动信息解析失败:', e)
        }
        console.log("ActivityInfo:", this.data.activityInfo)
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