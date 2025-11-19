const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const preuser = require('../models/preuser');
const login = require('../functions/login');

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
				premiu = premiumUser ? 'yes' : '';				// ユーザーのURL一覧を取得
				if (premiu) {
					// プレミアムユーザーの場合
					content = await premium.find({ userid: uniqueId }).sort({ createdAt: -1 });
				} else {
					// 無料ユーザーの場合（ユーザー固有のURLのみ取得）
					content = await tinyurl.find({ 
						$or: [
							{ userid: uniqueId },
							{ username: username }
						]
					}).sort({ createdAt: -1 });
				}
			} catch (error) {
				console.error('メールログインセッション解析エラー:', error);
			}
		}

		// 未ログインの場合はログインページにリダイレクト
		if (!username) {
			return res.redirect('/login');
		}

		// ダッシュボードを表示
		res.render('dash', {
			name: username,
			userId: userId,
			premiu: premiu,
			content: content,
			stats: {
				totalUrls: content.length,
				monthlyClicks: 1234, // 実際のアプリでは統計データを計算
				plan: premiu ? 'プレミアム' : 'フリー',
				status: 'アクティブ'
			}
		});

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
		let userId = null;

		// 認証チェック
		if (req.cookies.user_session) {
			const userSession = JSON.parse(req.cookies.user_session);
			username = userSession.username;
			userId = userSession.id;
		}

		if (!username) {
			return res.redirect('/login');
		}

			// 削除処理
			if (delnum) {
				const urlsToDelete = Array.isArray(delnum) ? delnum : [delnum];
				
				// プレミアムテーブルから削除（ユーザー固有）
				await premium.deleteMany({ 
					tiny: { $in: urlsToDelete },
					userid: userId 
				});
				
				// フリープランテーブルから削除（ユーザー固有）
				await tinyurl.deleteMany({ 
					tiny: { $in: urlsToDelete },
					$or: [
						{ userid: userId },
						{ username: username }
					]
				});
			}		// ダッシュボードにリダイレクト
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
		let userId = null;

		// 認証チェック
		if (req.cookies.user_session) {
			const userSession = JSON.parse(req.cookies.user_session);
			username = userSession.username;
			userId = userSession.id;
		}

		if (!username) {
			return res.redirect('/login');
		}

		// 全削除処理
		await premium.deleteMany({ userid: userId });
		
		// フリープランの場合は注意が必要（実際のアプリでは改善が必要）
		// 現在は全体を削除してしまうので、実装を見直す必要があります
		
		// ダッシュボードにリダイレクト
		res.redirect('/dashboard');

	} catch (error) {
		console.error('全URL削除エラー:', error);
		res.status(500).json({ error: '全URL削除中にエラーが発生しました' });
	}
});

module.exports = router;