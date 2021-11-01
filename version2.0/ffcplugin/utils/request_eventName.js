import { defaultUrl } from "../config";

/**
 * 获取事件类型
 * @param {*} secret 
 */
export const getEventName = (secret) => {

  let url = `${defaultUrl}/api/Experiments/${secret}`;

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
}