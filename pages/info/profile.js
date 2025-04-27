// pages/info/profile.js
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
const request = promisify(wx.request);
const uploadFile = promisify(wx.uploadFile); //封装uploadFile
Page({
    data: {
        //区分编辑模式/注册模式
        isEditMode: false, // 新增编辑模式标识
        tempToken: '', // 来自后端的临时令牌
        code: '', // 微信登录凭证
        // 修改1：新增初始本地路径记录
        initialLocalAvatarUrl: '', // 记录初始图片的路径
        currentLocalAvatarUrl: '', // 当前显示的本地路径
        serverAvatarUrl: '', // 服务端存储路径
        userInfo: { // 用户填写的注册信息
            name: '',
            role: '',
            class_name: '',
            student_id: '',
            email: ''
        }
    },
    //加载页面
    onLoad(options) {
        //1.加载本地缓存的草稿数据
        this.loadCachedData()
        // 先检查登录状态
        if (this.checkLoginStatus()) {
            console.log("[编辑模式]");
        } else {
            console.log("[注册模式]");
            this.initRegisterMode(options); // 注册模式初始化
        }
        // 记录初始本地路径（可能来自缓存或默认）
        this.setData({
            initialLocalAvatarUrl: this.data.currentLocalAvatarUrl
        });
        //调试
        console.log(this.data)
    },
    // 修改4：统一头像处理逻辑
    async handleAvatar() {
        // 判断是否需要上传
        if (this.needUploadAvatar()) {
            wx.showLoading({
                title: '上传中...'
            });
            try {
                const newUrl = await this.uploadNewAvatar();
                this.setData({
                    serverAvatarUrl: newUrl,
                    initialLocalAvatarUrl: this.data.currentLocalAvatarUrl // 更新基准
                });
                return newUrl;
            } finally {
                wx.hideLoading();
            }
        }
        return this.data.serverAvatarUrl;
    },
    // 修改5：精确的上传判断方法
    needUploadAvatar() {
        // 情况1：没有服务端记录（新注册）
        if (!this.data.serverAvatarUrl) return true;
        // 情况2：本地路径发生变化
        return this.data.currentLocalAvatarUrl !== this.data.initialLocalAvatarUrl;
    },
    // 修改6：上传图片逻辑
    async uploadNewAvatar() {
        const token = this.getUploadFormData()
        console.log("[Token]", token)
        const res = await uploadFile({
            url: 'http://127.0.0.1:8000/upload/avatar',
            filePath: this.data.currentLocalAvatarUrl,
            name: 'avatar',
            header: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }, // 关键修改：使用标准头部
        });
        console.log("[上传照片RES]",res)
        console.log("[图片上传成功]")
        if (res.statusCode !== 200) throw new Error('图片上传失败');
        //返回服务器存储的图片路径
        return JSON.parse(res.data).url;
    },
    // 修改getUploadFormData方法
    getUploadFormData() {
        if (this.data.isEditMode) {
            const token = wx.getStorageSync('auth_token');
            if (!token) throw new Error('请先登录');
            return token; // 正式token不加前缀
        } else {
            if (!this.data.tempToken) throw new Error('临时凭证无效');
            // 返回原始tempToken（不带额外前缀）
            return this.data.tempToken;
        }
    },
    // 新增登录状态检查方法
    checkLoginStatus() {
        const authToken = wx.getStorageSync('auth_token');
        this.setData({
            isEditMode: !!authToken
        }); //更新状态
        return this.data.isEditMode;; // 直接返回结果---非空则为真
    },
    // 新增注册模式初始化
    initRegisterMode(options) {
        // 参数校验加强版
        if (!options.temp_token || !options.code) {
            wx.showToast({
                title: '参数异常，请重新登录',
                icon: 'none',
                complete: () => {
                    wx.redirectTo({
                        url: '/pages/login/login'
                    });
                }
            });
            return;
        }
        console.log("[临时TOKEN]",options.temp_token)
        this.setData({
            tempToken: options.temp_token,
            code: options.code
        });
    },
    // 修改3：重构缓存加载逻辑
    loadCachedData() {
        const cachedData = wx.getStorageSync('userProfile') || {};
        this.setData({
            userInfo: {
                ...this.data.userInfo,
                ...cachedData.userInfo
            },
            currentLocalAvatarUrl: cachedData.currentLocalAvatarUrl || '/images/icon8.jpg',
            serverAvatarUrl: cachedData.serverAvatarUrl || '',
        });
        console.log("[缓存加载完毕]")
    },
    // 修改9：统一提交处理
    async handleRegistration() {
        console.log("[保存开始:]")
        try {
            //1.处理图片
            const finalAvatar = await this.handleAvatar();
            if (this.data.isEditMode) {
                //编辑模式更新资料
                await this.updateProfile(finalAvatar);
                console.log("[更新完成]")
            } else {
                //注册模式注册用户
                await this.registerUser(finalAvatar);
                console.log("[注册结束]")
            }
            // 修改10：成功后本地缓存
            this.updateLocalCache();
        } catch (error) {
            this.handleRegistrationError(error);
        }
    },
    // 修改11：重构注册方法
    async registerUser(finalAvatarUrl) {
        if (!this.validateRegistrationForm()) return;
        const res = await request({
            url: 'http://127.0.0.1:8000/login/register',
            method: 'POST',
            data: {
                temp_token: this.data.tempToken.replace(/^temp_/, ''),
                user_info: {
                    ...this.data.userInfo,
                    avatarUrl: finalAvatarUrl
                }
            }
        });
        // 【新增】注册成功后替换为正式token
        // 【新增】严格校验响应格式
        if (!res.data.token) throw new Error('注册失败：未获取到有效token');
        // 确保使用res.data.token而不是res.token
        const authToken = res.data.token;
        console.log("[正式返回的Token]:", authToken);
        // 添加存储异常处理
        try {
            wx.setStorageSync('auth_token', authToken);
        } catch (storageError) {
            console.error("存储token失败:", storageError);
            throw new Error('本地存储失败');
        }
        this.handleRegistrationSuccess(res);
    },
    // 修改12：重构更新方法
    async updateProfile(finalAvatarUrl) {
        const res = await request({
            url: 'http://127.0.0.1:8000/user/update',
            method: 'PUT',
            header: {
                'Authorization': `Bearer ${wx.getStorageSync('auth_token')}`
            },
            data: {
                ...this.data.userInfo,
                avatarUrl: finalAvatarUrl
            }
        });
        // 修改13：更新成功后缓存服务端路径
        this.setData({
            serverAvatarUrl: finalAvatarUrl,
            initialLocalAvatarUrl: finalAvatarUrl
        });
        this.updateLocalCache();
        wx.showToast({
            title: '更新成功',
            icon: 'success',
            complete: () => {
                wx.navigateBack();
            }
        });
    },

    // 表单验证方法
    validateRegistrationForm() {
        // 解构用户信息
        const {
            name,
            student_id
        } = this.data.userInfo;

        // 非空校验
        if (!name || !student_id) {
            wx.showToast({
                title: '姓名和学号为必填项',
                icon: 'none'
            });
            return false;
        }

        // 学号格式校验（8-20位数字）
        if (!/^\d{8,20}$/.test(student_id)) {
            wx.showToast({
                title: '学号格式不正确',
                icon: 'none'
            });
            return false;
        }

        return true; // 验证通过
    },
    // 注册成功处理
    handleRegistrationSuccess(res) {
        console.log("执行注册成功处理")
        // 显示成功提示
        wx.showToast({
            title: '注册成功',
            icon: 'success',
            complete: () => {
                wx.switchTab({
                    url: '/pages/info/info'
                });
            }
        });
    },
    // 错误处理
    handleRegistrationError(error) {
        console.error('注册流程异常:', error);
        // 显示错误提示
        wx.showToast({
            title: error.message || '注册失败',
            icon: 'none'
        });
    },
    // 头像上传入口
    uploadAvatar() {
        wx.showActionSheet({
            itemList: ['拍摄照片', '从相册选择'],
            success: (res) => {
                // 根据选择类型处理
                const authType = res.tapIndex === 0 ? 'camera' : 'album';
                this.checkAuthBeforeAction(authType);
            }
        });
    },

    // 权限检查（需要与profile.js保持统一）
    checkAuthBeforeAction(authType) {
        // 修正相册权限标识
        const scopeMap = {
            camera: 'scope.camera',
            album: 'scope.album' // 微信官方实际需要 scope.album
        };

        // 获取权限设置
        wx.getSetting({
            success: (res) => {
                const authStatus = res.authSetting[scopeMap[authType]];
                // 首次请求授权
                if (authStatus === undefined) {
                    this.requestAuth(authType);
                }
                // 已授权
                else if (authStatus) {
                    this.chooseImage(authType);
                }
                // 已拒绝
                else {
                    this.showAuthGuide(authType);
                }
            }
        });
    },
    // 显示权限引导
    showAuthGuide(authType) {
        const typeMap = {
            camera: '相机',
            album: '相册'
        }

        wx.showModal({
            title: '需要权限',
            content: `请允许访问${typeMap[authType]}以继续操作`,
            confirmText: '去设置',
            success: (res) => {
                if (res.confirm) wx.openSetting()
            }
        })
    },
    // 请求权限授权
    requestAuth(authType) {
        const scopeMap = {
            camera: 'scope.camera',
            album: 'scope.writePhotosAlbum'
        }

        wx.authorize({
            scope: scopeMap[authType],
            success: () => this.chooseImage(authType),
            fail: () => this.showAuthGuide(authType)
        })
    },
    // 选择图片/拍摄（优化后）
    chooseImage(sourceType) {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: [sourceType],
            success: (res) => {
                this.handleImageSuccess(res.tempFiles[0].tempFilePath)
            },
            fail: (err) => {
                console.error('选择失败:', err)
                if (err.errMsg.includes('auth')) {
                    this.showAuthGuide(sourceType)
                }
            }
        })
    },
    // 处理选择成功
    handleImageSuccess(tempFilePath) {
        this.setData({
            avatarUrl: tempFilePath, //V0
            currentLocalAvatarUrl: tempFilePath
        })
        // 修改7：实时更新本地缓存
        this.updateLocalCache();
        wx.showToast({
            title: '选择成功',
            icon: 'success'
        })
    },
    // 修改8：重构缓存更新方法
    updateLocalCache() {
        const cacheData = {
            userInfo: this.data.userInfo,
            currentLocalAvatarUrl: this.data.currentLocalAvatarUrl,
            serverAvatarUrl: this.data.serverAvatarUrl,
            lastUpdate: Date.now()
        };

        wx.setStorage({
            key: 'userProfile',
            data: cacheData,
            success: () => console.log('[DEBUG] 缓存写入成功'),
            fail: (err) => console.error('[ERROR] 缓存写入失败:', err)
        });
    },
    // 统一输入处理--动态显示
    bindNameInput(e) {
        this.setData({
            'userInfo.name': e.detail.value
        })
    },
    bindRoleInput(e) {
        this.setData({
            'userInfo.role': e.detail.value
        })
    },
    bindUniversityInput(e) {
        this.setData({
            'userInfo.class_name': e.detail.value
        })
    },
    bindStudentIdInput(e) {
        this.setData({
            'userInfo.student_id': e.detail.value
        })
    },
    bindEmailInput(e) {
        this.setData({
            'userInfo.email': e.detail.value
        })
    },
    // 修改onUnload（与updateLocalCache重复）：
    onUnload() {
        // 保留编辑模式的特殊处理（如需）
        if (!this.data.isEditMode && this.data.serverAvatarUrl) {
            this.updateLocalCache();
        }
    }
    // 其他生命周期函数保持原样...
})