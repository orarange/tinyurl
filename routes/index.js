const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const preuser = require('../models/preuser');
const User = require('../models/users');
const { checkUrlLimit } = require('../functions/usageLimits');

// ユーザー認証情報を取得する共通関数
async function getUserAuth(req, res) {
	// メール/パスワードログインのセッションチェック
	if (req.cookies.user_session) {
		try {
			const userSession = JSON.parse(req.cookies.user_session);
			// DBからユーザー情報を取得してuniqueIdを含める
			const user = await User.findById(userSession.id);
			if (user) {
				return {
					username: userSession.username,
					id: userSession.id,
					uniqueId: user.uniqueId,
					authType: 'email'
				};
			}
		} catch (err) {
			console.error('Session parse error:', err);
			// 無効なセッションをクリア
			res.clearCookie('user_session');
		}
	}

	return null;
}

// プレミアムユーザー情報を取得する共通関数
async function getPremiumStatus(uniqueId) {
	if (!uniqueId) return { isPremium: false, demo: false };
	
	try {
		const premiumUser = await preuser.findOne({ id: uniqueId });
		return {
			isPremium: !!premiumUser,
			demo: premiumUser?.demo || false
		};
	} catch (err) {
		console.error('Premium status check error:', err);
		return { isPremium: false, demo: false };
	}
}

// レンダリング用のデータを生成する共通関数
function getRenderData(userAuth, premiumStatus, additionalData = {}) {
	return {
		url: '',
		tiny: '',
		premiu: premiumStatus.isPremium ? 'yes' : '',
		name: userAuth?.username || '',
		demo: premiumStatus.demo ? 'disabled' : '',
		log: userAuth ? 'out' : 'in',
		domain: process.env.domain,
		...additionalData
	};
}

// メインページの表示
router.get('/', async (req, res) => {
	try {
		// ユーザー認証情報を取得
		const userAuth = await getUserAuth(req, res);
		
		// プレミアムステータスを取得（uniqueIdを使用）
		const premiumStatus = await getPremiumStatus(userAuth?.uniqueId);
		
		// レンダリングデータを生成
		const renderData = getRenderData(userAuth, premiumStatus);
		
		res.status(200).render('index', renderData);
	} catch (error) {
		console.error('Index page error:', error);
		// エラー時は未ログイン状態で表示
		const renderData = getRenderData(null, { isPremium: false, demo: false });
		res.status(500).render('index', renderData);
	}
});

// URL短縮処理
router.post('/tiny_url', async (req, res) => {
	try {
		const { original, custom, domain } = req.body;
		
		// URL形式の検証
		if (!original || !original.match(/^https?:\/\/.+/)) {
			const userAuth = await getUserAuth(req, res);
			const premiumStatus = await getPremiumStatus(userAuth?.uniqueId);
			const renderData = getRenderData(userAuth, premiumStatus, {
				url: original || '',
				tiny: 'Invalid URL format'
			});
			return res.status(400).render('index', renderData);
		}

		// ユーザー認証情報を取得
		const userAuth = await getUserAuth(req, res);
		
		// プレミアムステータスを取得（uniqueIdを使用）
		const premiumStatus = await getPremiumStatus(userAuth?.uniqueId);
		
		// 使用量制限をチェック（ログインユーザーのみ）
		if (userAuth && userAuth.uniqueId) {
			const limitCheck = await checkUrlLimit(userAuth.uniqueId);
			
			if (!limitCheck.allowed) {
				const renderData = getRenderData(userAuth, premiumStatus, {
					url: 'error',
					tiny: 'error'
				});
				return res.status(429).render('index', {
					...renderData,
					errorMessage: `今月のURL作成制限（${limitCheck.limit}個）に達しました。来月またはプレミアムプランへのアップグレードをご検討ください。`
				});
			}
		}
		
		// 短縮URLの生成
		const tinyCode = Math.random().toString(32).substring(2);
		const baseUrl = process.env.domain || 'orrn.net';
		const finalTinyCode = (premiumStatus.isPremium && custom) ? custom : tinyCode;
		
		console.log('URL短縮処理開始:', { 
			original, 
			custom, 
			isPremium: premiumStatus.isPremium,
			username: userAuth?.username 
		});

		// カスタムURLの重複チェック（カスタム指定時のみ）
		if (custom && premiumStatus.isPremium) {
			const existingUrl = await tinyurl.findOne({ tiny: custom });
			if (existingUrl) {
				const renderData = getRenderData(userAuth, premiumStatus, {
					url: custom,
					tiny: 'Already registered'
				});
				return res.status(400).render('index', renderData);
			}
		}

		// 統合モデルに保存（フリー・プレミアム共通）
		const newUrl = new tinyurl({
			userid: userAuth?.id || null,
			uniqueId: userAuth?.uniqueId || null,
			username: userAuth?.username || 'Anonymous',
			original: original,
			tiny: finalTinyCode,
			isPremium: premiumStatus.isPremium,
			isCustom: !!(custom && premiumStatus.isPremium),
			createdVia: 'web'
		});

		await newUrl.save();
		
		const renderData = getRenderData(userAuth, premiumStatus, {
			tiny: `https://${domain || baseUrl}/t/${finalTinyCode}`
		});
		
		console.log('短縮URL作成完了:', finalTinyCode);
		res.status(200).render('index', renderData);

	} catch (error) {
		console.error('URL短縮エラー:', error);
		
		// エラー時の処理
		try {
			const userAuth = await getUserAuth(req, res);
			const premiumStatus = await getPremiumStatus(userAuth?.uniqueId);
			const renderData = getRenderData(userAuth, premiumStatus, {
				url: req.body.original || '',
				tiny: 'Error occurred'
			});
			res.status(500).render('index', renderData);
		} catch (renderError) {
			console.error('Error rendering error page:', renderError);
			res.status(500).json({ error: 'Internal server error' });
		}
	}
});

module.exports = router;