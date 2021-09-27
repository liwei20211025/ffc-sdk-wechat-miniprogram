module.exports = {

  defaultRootUri: '',
  secretKey: '',
  sameFlagCallMinimumInterval: 15,
  userInfo: {
    "ffUserName": "",
    "ffUserEmail": "",
    "ffUserKeyId": "",
    "ffUserCustomizedProperties": [
    ]
  },
  featureFlags: [],
  storageKey: 'ffc-sdk-wechat-miniprogram',
  timer: null,
  init(
    secretKey = '',
    sameFlagCallMinimumInterval = 15) {
    this.secretKey = secretKey;
    this.defaultRootUri = 'https://api.feature-flags.co';
    this.sameFlagCallMinimumInterval = sameFlagCallMinimumInterval;
    this.featureFlags = this.getStorage();

    wx.setStorage({
      key: "ffc-userinfo",
      data: JSON.stringify(this.userInfo)
    });    
    wx.setStorage({
      key: "ffc-secretkey",
      data: this.secretKey
    });

    this.experimentsPage();

    let defaultRootUri = this.defaultRootUri;
    this.timer = setInterval(()=>{
      this.sendTelemetryToServer(defaultRootUri)
    }, 5000);
  },
  initFFUserInfo(userInfo) {
    this.userInfo = userInfo;
    wx.setStorage({
      key: "ffc-userinfo",
      data: JSON.stringify(this.userInfo)
    });
  },
  updateFFUserKeyId(ffUserKeyId) {
    this.userInfo.ffUserKeyId = ffUserKeyId;
    wx.setStorage({
      key: "ffc-userinfo",
      data: JSON.stringify(this.userInfo)
    });
  },
  updateFFUserName(ffUserName) {
    this.userInfo.ffUserName = ffUserName;
    wx.setStorage({
      key: "ffc-userinfo",
      data: JSON.stringify(this.userInfo)
    });
  },
  updateFFUserEmail(ffUserEmail) {
    this.userInfo.ffUserEmail = ffUserEmail;
    wx.setStorage({
      key: "ffc-userinfo",
      data: JSON.stringify(this.userInfo)
    });
  },
  updateFFCustomizedProperties(customizedProperties) {
    this.userInfo.customizedProperties = customizedProperties;
    wx.setStorage({
      key: "ffc-userinfo",
      data: JSON.stringify(this.userInfo)
    });
  },
  checkFromStorage(storageKey) {
    let lastFFVariationStr = wx.getStorageSync(storageKey);
    let lastFFVariation = null;
    if (lastFFVariationStr && lastFFVariationStr !== null) {
      lastFFVariation = JSON.parse(lastFFVariationStr);
    }
    return lastFFVariation;
  },
  actionWhenError(action, lastFFVariation, returnValueWhenUnhandledException) {
    if (lastFFVariation == null) {
      action(returnValueWhenUnhandledException);
    }
    else {
      action(lastFFVariation.data.variationValue);
    }
  },
  getStorage() {
    let featureFlags = wx.getStorageSync(this.storageKey);
    if (!featureFlags || featureFlags === null || featureFlags.length === 0) {
      wx.setStorage({
        key: this.storageKey,
        data: JSON.stringify([])
      });
      featureFlags = wx.getStorageSync(this.storageKey);
    }
    return JSON.parse(featureFlags);
  },
  updateFeatureFlags(key, variationValue, featureFlags, storageKey) {
    let ff = featureFlags.find(p => p.key == key);
    let data = {
      variationValue,
      timeStamp: Math.round(new Date().getTime() / 1000)
    };
    if (ff)
      ff.data = data
    else {
      featureFlags.push({
        key,
        data
      })
    }
    wx.setStorage({
      key: storageKey,
      data: JSON.stringify(featureFlags)
    });
  },
  checkVariation(
    featureFlagKeyName,
    action,
    returnValueWhenUnhandledException = { localId: -1, variationValue: 'error' }) {
    let body = {
      ffUserName: this.userInfo.ffUserName,
      ffUserEmail: this.userInfo.ffUserEmail,
      ffUserKeyId: this.userInfo.ffUserKeyId,
      ffUserCustomizedProperties: this.userInfo.ffUserCustomizedProperties,
      environmentSecret: this.secretKey,
      featureFlagKeyName: featureFlagKeyName
    };

    let key = body.featureFlagKeyName + '@@' + body.ffUserKeyId;
    let lastFFVariation = this.featureFlags.find(p => p.key == key);
    let nowTimeStamp = Math.round(new Date().getTime() / 1000);
    if (lastFFVariation && lastFFVariation !== null &&
      (this.sameFlagCallMinimumInterval >= (nowTimeStamp - lastFFVariation.data.timeStamp) &&
        lastFFVariation.data.timeStamp < nowTimeStamp)) {
      action(lastFFVariation.data.variationValue);
    }
    else {
      let actionWhenError = this.actionWhenError;
      let updateFeatureFlags = this.updateFeatureFlags;
      let featureFlags = this.featureFlags;
      let storageKey = this.storageKey;
      wx.request({
        url: this.defaultRootUri + '/Variation/GetMultiOptionVariation',
        data: body,
        header: { 'Content-Type': 'application/json' },
        method: 'POST',
        fail: function (res) {
          actionWhenError(action, lastFFVariation, returnValueWhenUnhandledException);
        },
        success: function (res) {
          if (res.statusCode === 200) {
            updateFeatureFlags(key, res.data, featureFlags, storageKey);
            action(res.data);
          }
          else {
            actionWhenError(action, lastFFVariation, returnValueWhenUnhandledException);
          }
        }
      });
    }
  },
  checkVariationAsync(
    featureFlagKeyName,
    returnValueWhenUnhandledException = { localId: -1, variationValue: 'error' }) {
    let body = {
      ffUserName: this.userInfo.ffUserName,
      ffUserEmail: this.userInfo.ffUserEmail,
      ffUserKeyId: this.userInfo.ffUserKeyId,
      ffUserCustomizedProperties: this.userInfo.ffUserCustomizedProperties,
      environmentSecret: this.secretKey,
      featureFlagKeyName: featureFlagKeyName
    };

    let key = body.featureFlagKeyName + '@@' + body.ffUserKeyId;
    let lastFFVariation = this.featureFlags.find(p => p.key == key);
    let nowTimeStamp = Math.round(new Date().getTime() / 1000);

    if (lastFFVariation && lastFFVariation !== null &&
      (this.sameFlagCallMinimumInterval >= (nowTimeStamp - lastFFVariation.data.timeStamp) &&
        lastFFVariation.data.timeStamp < nowTimeStamp)) {
      return lastFFVariation.data.variationValue;
    }

    return new Promise((resolve, reject) => {
      let updateFeatureFlags = this.updateFeatureFlags;
      let featureFlags = this.featureFlags;
      let storageKey = this.storageKey;
      wx.request({
        url: this.defaultRootUri + '/Variation/GetMultiOptionVariation',
        data: body,
        header: { 'Content-Type': 'application/json' },
        method: 'POST',
        fail: function (res) {
          resolve(
            (!lastFFVariation || lastFFVariation === null) ?
              returnValueWhenUnhandledException
              :
              lastFFVariation.data.variationValue);
        },
        success: function (res) {
          if (res.statusCode === 200) {
            updateFeatureFlags(key, res.data, featureFlags, storageKey);
            resolve(res.data);
          }
          else {
            resolve(
              (!lastFFVariation || lastFFVariation === null) ?
                returnValueWhenUnhandledException
                :
                lastFFVariation.data.variationValue);
          }
        }
      });
    });
  },
  experimentsPage() {
    // 重写page函数，增加阿里云监控和日志记录
    wx.setStorage({
      key: "ffc-sdk-wechat-miniprogram-pageview",
      data: JSON.stringify([])
    });
    let oldPage = Page
    Page = function (obj) {
      // console.log(obj);
      let oldOnShow = obj.onShow
      obj.onShow = function () {
        // console.log(this)
        let route = this.route;
        wx.nextTick(() => {
          // console.log("nextTick");
          let storageKey = "ffc-sdk-wechat-miniprogram-pageview";
          let pageViewsStr = wx.getStorageSync(storageKey);
          let pageViews = JSON.parse(pageViewsStr);
          let secretKey = wx.getStorageSync("ffc-secretkey")
          let userInfo = JSON.parse(wx.getStorageSync("ffc-userinfo"));
          pageViews.push({
            route: route,
            type: 'pageview',
            user: userInfo,
            appType: 'MiniProgram',
            secret: secretKey,
            eventName: 'pageview'
          })
          wx.setStorage({
            key: storageKey,
            data: JSON.stringify(pageViews)
          });
          if (oldOnShow !== undefined)
            oldOnShow.call(this);
        })
        // console.log(obj)
      }

      Object.keys(obj).forEach((methodName) => {
        const originMethod = obj[methodName];
        if (typeof originMethod !== "function") {
          return true;
        }
        (obj)[methodName] = function (...args) {
          if (args && args[0] && args[0].type == 'tap' && args[0]._userTap) {
            let route = this.route;
            wx.nextTick(() => {
              let storageKey = "ffc-sdk-wechat-miniprogram-pageview";
              let pageViewsStr = wx.getStorageSync(storageKey);
              let pageViews = JSON.parse(pageViewsStr);
              let secretKey = wx.getStorageSync("ffc-secretkey");
              let userInfo = JSON.parse(wx.getStorageSync("ffc-userinfo"));
              pageViews.push({
                route: route,
                type: 'click',
                user: userInfo,
                appType: 'MiniProgram',
                secret: secretKey,
                eventName: 'click',
                customizedProperties: [{
                  name: 'methodnanme',
                  value: methodName
                }]
              })
              wx.setStorage({
                key: storageKey,
                data: JSON.stringify(pageViews)
              });
            })
          }

          return originMethod.call(this, ...args);
        };
      });
      return oldPage(obj)
    }
  },
  // here message is the eventname
  track(message, eventType, methodName, customizedProperties) {
    wx.nextTick(() => {
      // console.log("track");
      let storageKey = "ffc-sdk-wechat-miniprogram-pageview";
      let pageViewsStr = wx.getStorageSync(storageKey);
      let pageViews = JSON.parse(pageViewsStr);
      let secretKey = wx.getStorageSync("ffc-secretkey")
      let userInfo = JSON.parse(wx.getStorageSync("ffc-userinfo"));
      pageViews.push({
        type: 'customEvent',
        eventName: message,
        eventType: eventType,
        customizedProperties: customizedProperties,
        user: userInfo,
        appType: 'MiniProgram',
        secret: secretKey,
        customizedProperties
      })
      wx.setStorage({
        key: storageKey,
        data: JSON.stringify(pageViews)
      });
    })
  },
  sendTelemetryToServer(defaultRootUri) {
    let storageKey = "ffc-sdk-wechat-miniprogram-pageview";
    let pageViewsStr = wx.getStorageSync(storageKey);
    wx.setStorage({
      key: storageKey,
      data: JSON.stringify([])
    });
    let pageViews = JSON.parse(pageViewsStr);
    let failedEvet = [];
    if (pageViews && pageViews.length > 0) {
      wx.request({
        url: defaultRootUri + '/ExperimentsDataReceiver/PushData',
        data: pageViews,
        header: { 'Content-Type': 'application/json' },
        method: 'POST',
        fail: function (res) {
          actionWhenError(action, lastFFVariation, returnValueWhenUnhandledException);
        },
        success: function (res) {
          if (res.statusCode === 200) {
            let newPageViewsStr = wx.getStorageSync(storageKey);
            let newPageViews = JSON.parse(newPageViewsStr);
            failedEvet.forEach((item) => {
              newPageViews.push(item)
            })
            wx.setStorage({
              key: storageKey,
              data: JSON.stringify(newPageViews)
            });
          }
          else {
            actionWhenError(action, lastFFVariation, returnValueWhenUnhandledException);
          }
        }
      });
    }
  }
}