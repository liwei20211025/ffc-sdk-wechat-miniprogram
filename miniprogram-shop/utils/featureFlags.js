const WXAPI = require('apifm-wxapi')
const FFC = requirePlugin('ffc-sdk-wechat-miniprogram')

function setUserInfo(wechatUserInfo) {
	FFC.initFFUserInfo({
		ffUserName: wechatUserInfo.base.nick,
		ffUserEmail: "",
		ffUserKeyId: `${wechatUserInfo.base.id}`,
		ffUserCustomizedProperties: [
			{
				name: "gender",
				value: `${wechatUserInfo.base.gender}`
			},
			{
				name: "sourceStr",
				value: `${wechatUserInfo.base.sourceStr}`
			}
		]
	});
}

function categoryPage(actions) {
	FFC.checkVariation(
		'ffc-multi-variation-ffp-test-data3-1628224107322',
		e => {
			switch (e.variationValue) {
				case 'Green':
					wx.setTabBarItem({
						index: 1,
						pagePath: "pages/index/index",
						iconPath: "images/nav/home-off.png",
						selectedIconPath: "images/nav/home-on.png",
						text: "分类(Dev)"
					});
					let action = actions.find(p => p.variationValue == 'Dev');
					console.log(action);
					action.action();
					break;
				default:
					(actions.find(p => p.variationValue == 'Default')).action();
					break;
			}
		});
}

function adminPanel(actions) {
	FFC.checkVariation(
		'ffc-multi-variation-ffp-test-data3-1628224107322',
		e => {
			switch (e.variationValue) {
				case 'Blue':
					let action = actions.find(p => p.variationValue == 'Blue');
					action.action();
					break;
				default:
					(actions.find(p => p.variationValue == 'Default')).action();
					break;
			}
		});
}

async function testAsync() {
	let result = await FFC.checkVariationAsync('ffc-multi-variation-ffp-test-data3-1628224107322');
	return result;
}

async function test(action) {
	FFC.checkVariation(
		'ffc-multi-variation-ffp-test-data3-1628224107322',
		e => {
			action(e);
		});
}

module.exports = {
	categoryPage: categoryPage,
	adminPanel: adminPanel,
	setUserInfo: setUserInfo,
	testAsync: testAsync,
	test: test
}
