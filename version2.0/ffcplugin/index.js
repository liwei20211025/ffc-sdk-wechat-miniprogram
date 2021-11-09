import * as KEY from "./config";
import { getEventName } from "./utils/request_eventName";
import { idRouteEquals } from "./utils/id_route_equals";
import { routeEquals } from "./utils/route_equals";

module.exports = {

  defaultRootUri: '',
  secretKey: '',
  sameFlagCallMinimumInterval: 15,
  userInfo: {
    "ffUserName": "",
    "ffUserEmail": "",
    "ffUserKeyId": "",
    "ffUserCustomizedProperties": []
  },
  featureFlags: [],
  storageKey: KEY.storageKey_sdk,
  timer: null,
  eventNames: [],
  featureFlagKeyName: "",

  async init(secretKey = '', sameFlagCallMinimumInterval = 15) {
    this.secretKey = secretKey;
    this.defaultRootUri = KEY.defaultUrl;
    this.sameFlagCallMinimumInterval = sameFlagCallMinimumInterval;
    this.featureFlags = this.getStorage();

    wx.setStorage({
      key: KEY.storageKey_user,
      data: JSON.stringify(this.userInfo)
    });    
    wx.setStorage({
      key: KEY.storageKey_secret,
      data: this.secretKey
    });
    wx.setStorage({
      data: JSON.stringify([]),
      key: KEY.storageKey_customevent,
    })

    this.experimentsPage();

    this.eventNames = await this.initEventNames();
  },

  // 初始化 eventName
  initEventNames() {
    let url = `${this.defaultRootUri}/api/Experiments/${this.secretKey}`;

    return new Promise((resolve, reject) => {
      wx.request({
        url,
        header: { 'Content-Type': 'application/json' },
        method: 'GET',
        fail: function (res) {
          reject(res)
        },
        success: (result) => {
          resolve(result.data);
        }
      });
    })
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

    // 保存开关名字
    this.featureFlagKeyName = featureFlagKeyName;
    
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

    // 保存开关名字
    this.featureFlagKeyName = featureFlagKeyName;

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
    wx.setStorage({
      key: KEY.storageKey_pageview,
      data: JSON.stringify([])
    });
    this.rewritePage(this.rewriteOnShowFunc, this.rewriteEventListener);
  },

  // 重写 Page 构造器
  rewritePage(rewriteFunc, rewriteEvent) {
    let oldPage = Page;
    // 重写page函数，增加阿里云监控和日志记录
    Page = (obj) => {
      rewriteFunc(obj, this);
      rewriteEvent(obj, this);
      return oldPage(obj);
    }
  },

  // 重写 onShow 生命周期函数
  rewriteOnShowFunc(obj, that) {
    let oldOnShow = obj.onShow;
    obj.onShow = function() {
      let route = this.route;

      this.timer = setTimeout(() => {
        let eventName = routeEquals(that.eventNames, route);

        if(eventName) {
          let storageKey = KEY.storageKey_pageview;
          let pageViewsStr = wx.getStorageSync(storageKey);
          let pageViews = JSON.parse(pageViewsStr);
          let secretKey = wx.getStorageSync(KEY.storageKey_secret);
          let userInfo = JSON.parse(wx.getStorageSync(KEY.storageKey_user));
          
          pageViews.push({
            route: route,
            type: KEY.pageview_type,
            user: userInfo,
            appType: KEY.appType,
            secret: secretKey,
            eventName: eventName
          });

          wx.setStorage({
            key: storageKey,
            data: JSON.stringify(pageViews)
          });

          that.sendTelemetryToServer(that.defaultRootUri)
        }

        oldOnShow && oldOnShow.call(that); 
      }, 500)
    }
  },

  // 重写事件监听
  rewriteEventListener(obj, that) {

    Object.keys(obj).forEach((key) => {

      const pageProperty = obj[key];

      if(typeof pageProperty === "function") {
        let oldMethod = pageProperty;
        
        obj[key] = function(event) {

          (event && event.type && event.type === 'tap') && (() => {
            
            wx.nextTick(() => {
              let route = this.route;
              let id = event.currentTarget.id;
              let eventName = idRouteEquals(that.eventNames, id, route);

              if(eventName) {
                
                let secretKey = wx.getStorageSync(KEY.storageKey_secret)
                let userInfo = JSON.parse(wx.getStorageSync(KEY.storageKey_user));

                wx.setStorageSync(KEY.storageKey_pagevent, JSON.stringify({
                  route,
                  secret: secretKey,
                  eventName: eventName,
                  user: userInfo,
                  appType: KEY.appType,
                  type: KEY.pagevent_type
                }))

                that.setClickEventParams();
              }
            })
          })();

          oldMethod.call(this);
        }
      }
    })
  },

  // 处理点击事件监听参数
  async setClickEventParams() {
    let storageKey = KEY.storageKey_pagevent;
    let pageventStr = wx.getStorageSync(storageKey);
  
    wx.setStorage({
      key: storageKey,
      data: JSON.stringify({})
    });
    let pagevent = [JSON.parse(pageventStr)];

    let url = this.defaultRootUri + '/ExperimentsDataReceiver/PushData';

    await this.checkVariationAsync(this.featureFlagKeyName);
    this.sendRequest(url, pagevent, (result) => {

    }, (result) => {

    });
  },

  // 自定义事件
  track(eventName, eventType, methodName, customizedProperties) {
    wx.nextTick(() => {
      let storageKey = KEY.storageKey_customevent;
      let pageViewsStr = wx.getStorageSync(storageKey);
      let pageViews = JSON.parse(pageViewsStr);
      let secretKey = wx.getStorageSync(KEY.storageKey_secret);
      let userInfo = JSON.parse(wx.getStorageSync(KEY.storageKey_user));
      pageViews.push({
        type: KEY.customevent_type,
        eventName: eventName,
        eventType: eventType,
        user: userInfo,
        appType: KEY.appType,
        secret: secretKey,
        customizedProperties
      })
      wx.setStorage({
        key: storageKey,
        data: JSON.stringify(pageViews)
      });

      this.setCustomEventParams();
    })
  },

  // 设置自定义事件参数
  async setCustomEventParams() {
    let storageKey = KEY.storageKey_customevent;
    let customEventStr = wx.getStorageSync(storageKey);

    wx.setStorage({
      data: JSON.stringify([]),
      key: storageKey,
    })

    let pageViews = JSON.parse(customEventStr);

    let url = this.defaultRootUri + '/ExperimentsDataReceiver/PushData';

    await this.checkVariationAsync(this.featureFlagKeyName);
    this.sendRequest(url, pageViews, (result) => {

    }, (result) => {

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
  },

  // 发送请求
  sendRequest(url, data, success, fail) {
    wx.request({
      url,
      data,
      header: { 'Content-Type': 'application/json' },
      method: 'POST',
      fail,
      success
    });
  }
}