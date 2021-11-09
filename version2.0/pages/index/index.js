const FFC = require('../../ffcplugin/index')

Page({
  data: {
    versionText: 'ad',
    showVersion: [false, false, false],
    btnName: "程序员版",
    btnShow: true
  },
  onLoad() {
    FFC.checkVariation(
      '小程序开关',
      e => {
        let versions = [false, true, false];
        let variations = ['产品经理版1', '程序员版1', '产品经理版2'];
        versions[variations.indexOf(e.variationValue)] = true;
        this.setData({
          showVersion: versions 
        })
    });

    // setTimeout(() => {
    //   const query = wx.createSelectorQuery().in(this);
    //   query.select("#test")._component.setData({
    //     btnShow: false
    //   });
    // }, 1000)
  },

  onclick(event) {
  },

  onclick1(event) {
    FFC.track('自定义事件');
  }
})
