const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const preuser = require('../models/preuser');
const { authenticateToken, logApiUsage } = require('../functions/apiAuth');

// 全てのAPIエンドポイントにトークン認証と使用履歴記録を適用
router.use(authenticateToken);
router.use(logApiUsage);

router.get('/', function (req, res) {
	res.json({ 
		hello: 'world',
		message: 'Tiny-URL API is running',
		user: req.user.uniqueId,
		endpoints: [
			'POST /api/make - URL短縮',
			'GET /api/reference - APIドキュメント'
		]
	});
});

router.post('/make', async (req, res) => {
	try {
		const tinyuRl = Math.random().toString(32).substring(2);
		const { original, custom, domain } = req.body;
		const uniqueId = req.user.uniqueId;
		
		console.log('API /make called by user:', uniqueId);
		console.log(req.body);

		if (!original) {
			console.log('no URL');
			return res.status(400).json({ status: '400', message: 'Bad Request: original URL is required' });
		}

		if (!original.match(/^https?/)) {
			console.log('not URL');
			return res.status(400).json({ status: '400', message: 'Bad Request: invalid URL format' });
		}

		// プレミアムユーザーかチェック
		const premiumUser = await preuser.findOne({ id: uniqueId });
		const isPremium = !!premiumUser;
		console.log(isPremium ? 'premium plan' : 'free plan');

		// カスタムURL重複チェック
		if (custom) {
			console.log('custom URL requested:', custom);
			const existingUrl = await tinyurl.findOne({ tiny: custom });
			if (existingUrl) {
				return res.status(400).json({ status: '400', message: 'Bad Request', tiny: 'Registered' });
			}
		}

		// 統合モデルで保存
		const tinyCode = custom || tinyuRl;
		const newUrl = new tinyurl({
			uniqueId: uniqueId,
			userid: uniqueId,
			original: original,
			tiny: tinyCode,
			isPremium: isPremium,
			isCustom: !!custom,
			createdVia: 'api'
		});

		await newUrl.save();

		// レスポンス生成
		const responseUrl = domain 
			? `https://${domain}/${tinyCode}` 
			: `https://orrn.net/t/${tinyCode}`;

		res.json({ 
			status: '200', 
			message: 'request was successful!', 
			tiny: responseUrl 
		});

	} catch (error) {
		console.error('API /make error:', error);
		res.status(500).json({ 
			status: '500', 
			message: 'Internal Server Error' 
		});
	}
});

module.exports = router;