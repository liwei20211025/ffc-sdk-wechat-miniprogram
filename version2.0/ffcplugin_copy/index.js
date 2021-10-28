import * as KEY from "./config";
import { getEventName } from "./utils/request_eventName";
import { idRouteEquals } from "./utils/id_route_equals";

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

  init(secretKey = '', sameFlagCallMinimumInterval = 15) {
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

    this.initEventNames();
    this.rewritePageFunction();
  },

  // 初始化 eventName
  async initEventNames() {
    let result = await getEventName(this.secretKey);
    this.eventNames = result;
    console.log(this.eventNames)
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

  initFFUserInfo(userInfo) {
    this.userInfo = userInfo;
    wx.setStorage({
      key: KEY.storageKey_user,
      data: JSON.stringify(this.userInfo)
    });
  },

  // 重写 Page 函数
  rewritePageFunction() {
    console.log("重写 Page 函数");
    let oldPage = Page;
    let that = this;

    let storageKey = KEY.storageKey_pageview;
    wx.setStorageSync(storageKey, JSON.stringify([]));

    Page = function(obj) {

      let oldOnShow = obj.onShow;

      // obj.onShow = function() {

      //   wx.nextTick(() => {
      //     let route = that.route;
          
      //     let pageViewsStr = wx.getStorageSync(storageKey);
      //     let pageViews = JSON.parse(pageViewsStr);
      //     let secretKey = wx.getStorageSync(KEY.storageKey_secret)
      //     let userInfo = JSON.parse(wx.getStorageSync(KEY.storageKey_user));
      //     pageViews.push({
      //       route: route,
      //       type: KEY.pageview_type,
      //       user: userInfo,
      //       appType: KEY.appType,
      //       secret: secretKey,
      //       eventName: "pageview"
      //     })
      //     wx.setStorage({
      //       key: storageKey,
      //       data: JSON.stringify(pageViews)
      //     });
      //   })

      //   oldOnShow && oldOnShow.call(this);
      // }

      // 对页面点击事件进行监听
      that.rewriteEventListener(obj, that);

      return oldPage(obj);
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

    // 从 Storage 获取 eventName
    // console.log(wx.getStorageSync(this.storageKey));

    await this.checkVariationAsync("小程序开关");
    this.sendRequest(url, pagevent, this.clickEventSuccess, this.clickEventFailed)
  },

  clickEventSuccess(result) {
    console.log(result)
  },

  clickEventFailed(error) {
    console.log(error)
  },

  checkVariationAsync(featureFlagKeyName, returnValueWhenUnhandledException = { localId: -1, variationValue: 'error' }) {
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
          resolve((!lastFFVariation || lastFFVariation === null) ? returnValueWhenUnhandledException : lastFFVariation.data.variationValue);
        },
        success: function (res) {
          if (res.statusCode === 200) {
            updateFeatureFlags(key, res.data, featureFlags, storageKey);
            resolve(res.data);
          }
          else {
            resolve((!lastFFVariation || lastFFVariation === null) ? returnValueWhenUnhandledException : lastFFVariation.data.variationValue);
          }
        }
      });
    });
  },

  actionWhenError(action, lastFFVariation, returnValueWhenUnhandledException) {
    if (lastFFVariation == null) {
      action(returnValueWhenUnhandledException);
    }
    else {
      action(lastFFVariation.data.variationValue);
    }
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