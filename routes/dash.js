const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const preuser = require('../models/preuser');
const apiToken = require('../models/apiToken');
const apiUsage = require('../models/apiUsage');
const login = require('../functions/login');
const crypto = require('crypto');

// ダッシュボード表示
router.get('/', async (req, res) => {
	try {
		let username = null;
		let userId = null;
		let uniqueId = null;
		let premiu = '';
		let content = [];

		// 認証チェック(メールログインのみ)
		if (req.cookies.user_session) {
			// メール・パスワードログインの場合
			try {
				const userSession = JSON.parse(req.cookies.user_session);
				username = userSession.username;
				userId = userSession.id;
				uniqueId = userSession.uniqueId;

				// プレミアムユーザーかチェック（uniqueIdを使用）
				const premiumUser = await preuser.findOne({ id: uniqueId });
				premiu = premiumUser ? 'yes' : '';

				// ページネーション設定
				const page = parseInt(req.query.page) || 1;
				const limit = parseInt(req.query.limit) || 20;
				const skip = (page - 1) * limit;

				// 統合モデルからURL一覧を取得
				content = await tinyurl.find({ uniqueId: uniqueId })
					.sort({ createdAt: -1 })
					.limit(limit)
					.skip(skip);

				// 総URL数を取得
				const totalUrls = await tinyurl.countDocuments({ uniqueId: uniqueId });
				const totalPages = Math.ceil(totalUrls / limit);

				// APIトークンを取得
				const apiTokens = await apiToken.find({ uniqueId: uniqueId }).sort({ createdAt: -1 });

				// 今月のAPI使用回数を取得
				const startOfMonth = new Date();
				startOfMonth.setDate(1);
				startOfMonth.setHours(0, 0, 0, 0);
				const apiUsageCount = await apiUsage.countDocuments({
					uniqueId: uniqueId,
					timestamp: { $gte: startOfMonth }
				});

				// ダッシュボードを表示
				return res.render('dash', {
					name: username,
					userId: userId,
					premiu: premiu,
					content: content,
					apiTokens: apiTokens,
					apiUsageCount: apiUsageCount,
					pagination: {
						currentPage: page,
						totalPages: totalPages,
						limit: limit,
						totalUrls: totalUrls
					},
					stats: {
						totalUrls: totalUrls,
						monthlyClicks: 1234, // 実際のアプリでは統計データを計算
						plan: premiu ? 'プレミアム' : 'フリー',
						status: 'アクティブ'
					}
				});
			} catch (error) {
				console.error('メールログインセッション解析エラー:', error);
			}
		}

		// 未ログインの場合はログインページにリダイレクト（フォールバック）
		if (!username) {
			return res.redirect('/login');
		}

	} catch (error) {
		console.error('ダッシュボード表示エラー:', error);
		res.status(500).render('error', { 
			message: 'ダッシュボードの読み込み中にエラーが発生しました',
			error: error 
		});
	}
});

// URL削除機能
router.post('/delete', async (req, res) => {
	try {
		const { delnum } = req.body;
		let username = null;
		let uniqueId = null;

		// 認証チェック
		if (req.cookies.user_session) {
			const userSession = JSON.parse(req.cookies.user_session);
			username = userSession.username;
			uniqueId = userSession.uniqueId;
		}

		if (!username || !uniqueId) {
			return res.redirect('/login');
		}

		// 削除処理
		if (delnum) {
			const urlsToDelete = Array.isArray(delnum) ? delnum : [delnum];
			
			// API経由で作成されたURLの数をカウント
			const apiCreatedCount = await tinyurl.countDocuments({
				tiny: { $in: urlsToDelete },
				uniqueId: uniqueId,
				createdVia: 'api'
			});
			
			// 統合モデルから削除（ユーザー固有のみ）
			await tinyurl.deleteMany({ 
				tiny: { $in: urlsToDelete },
				uniqueId: uniqueId
			});
			
			// API経由で作成されたURLを削除した場合、API使用履歴も同期
			if (apiCreatedCount > 0) {
				// 削除したURL分のAPI使用履歴を削除（最新のものから）
				const apiUsagesToDelete = await apiUsage.find({
					uniqueId: uniqueId,
					endpoint: '/api/make',
					method: 'POST'
				})
				.sort({ timestamp: -1 })
				.limit(apiCreatedCount)
				.select('_id');
				
				const idsToDelete = apiUsagesToDelete.map(doc => doc._id);
				await apiUsage.deleteMany({ _id: { $in: idsToDelete } });
			}
		}

		// ダッシュボードにリダイレクト
		res.redirect('/dashboard');

	} catch (error) {
		console.error('URL削除エラー:', error);
		res.status(500).json({ error: 'URL削除中にエラーが発生しました' });
	}
});

// 全URL削除機能
router.post('/delete-all', async (req, res) => {
	try {
		let username = null;
		let uniqueId = null;

		// 認証チェック
		if (req.cookies.user_session) {
			const userSession = JSON.parse(req.cookies.user_session);
			username = userSession.username;
			uniqueId = userSession.uniqueId;
		}

		if (!username || !uniqueId) {
			return res.redirect('/login');
		}

		// API経由で作成されたURLの数をカウント
		const apiCreatedCount = await tinyurl.countDocuments({
			uniqueId: uniqueId,
			createdVia: 'api'
		});

		// 全削除処理
		await tinyurl.deleteMany({ uniqueId: uniqueId });
		
		// API経由で作成されたURLを削除した場合、API使用履歴も同期
		if (apiCreatedCount > 0) {
			const apiUsagesToDelete = await apiUsage.find({
				uniqueId: uniqueId,
				endpoint: '/api/make',
				method: 'POST'
			})
			.sort({ timestamp: -1 })
			.limit(apiCreatedCount)
			.select('_id');
			
			const idsToDelete = apiUsagesToDelete.map(doc => doc._id);
			await apiUsage.deleteMany({ _id: { $in: idsToDelete } });
		}
		
		// ダッシュボードにリダイレクト
		res.redirect('/dashboard');

	} catch (error) {
		console.error('全URL削除エラー:', error);
		res.status(500).json({ error: '全URL削除中にエラーが発生しました' });
	}
});

// APIトークン生成
router.post('/api-token/create', async (req, res) => {
	try {
		let uniqueId = null;

		// 認証チェック
		if (req.cookies.user_session) {
			const userSession = JSON.parse(req.cookies.user_session);
			uniqueId = userSession.uniqueId;
		}

		if (!uniqueId) {
			return res.redirect('/login');
		}

		// トークンを生成（128bit = 32文字の16進数）
		const token = 'turl_' + crypto.randomBytes(32).toString('hex');
		const tokenName = req.body.tokenName || 'Default Token';

		// データベースに保存
		const newToken = new apiToken({
			uniqueId: uniqueId,
			token: token,
			name: tokenName,
			isActive: true
		});

		await newToken.save();
		console.log(`API token created for user ${uniqueId}: ${tokenName}`);

		res.redirect('/dashboard');

	} catch (error) {
		console.error('APIトークン作成エラー:', error);
		res.status(500).send('APIトークン作成中にエラーが発生しました');
	}
});

// APIトークン削除
router.post('/api-token/delete', async (req, res) => {
	try {
		let uniqueId = null;

		// 認証チェック
		if (req.cookies.user_session) {
			const userSession = JSON.parse(req.cookies.user_session);
			uniqueId = userSession.uniqueId;
		}

		if (!uniqueId) {
			return res.redirect('/login');
		}

		const { tokenId } = req.body;

		// 自分のトークンのみ削除可能
		await apiToken.deleteOne({
			_id: tokenId,
			uniqueId: uniqueId
		});

		console.log(`API token deleted: ${tokenId}`);

		res.redirect('/dashboard');

	} catch (error) {
		console.error('APIトークン削除エラー:', error);
		res.status(500).send('APIトークン削除中にエラーが発生しました');
	}
});

module.exports = router;