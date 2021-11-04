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
      '主页---话术版本',
      e => {
        let versions = [false, false, false];
        let variations = ['产品经理版1', '程序员版1', '产品经理版2'];
        versions[variations.indexOf(e.variationValue)] = true;
        this.setData({
          showVersion: versions 
        })
    });

    setTimeout(() => {
      const query = wx.createSelectorQuery().in(this);
      console.log(query.select("#test"))
      query.select("#test")._component.setData({
        btnShow: false
      });
    }, 1000)
  },

  onclick(event) {

  }
})
