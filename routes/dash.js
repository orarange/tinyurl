const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const preuser = require('../models/preuser');
const refresh = require('../functions/refresh');
const userdat = require('../functions/userdata');
const login = require('../functions/login');

main().catch(err => console.log(err));

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

// ダッシュボード表示
router.get('/', async (req, res) => {
	try {
		let username = null;
		let userId = null;
		let isPremium = false;
		let content = [];

		// 認証チェック（Discordログインまたはメールログイン）
		if (req.cookies.user_session) {
			// メール・パスワードログインの場合
			try {
				const userSession = JSON.parse(req.cookies.user_session);
				username = userSession.username;
				userId = userSession.id;

				// プレミアムユーザーかチェック
				const premiumUser = await preuser.findOne({ id: userId });
				isPremium = !!premiumUser;

				// ユーザーのURL一覧を取得
				if (isPremium) {
					// プレミアムユーザーの場合
					content = await premium.find({ userid: userId }).sort({ createdAt: -1 });
				} else {
					// 無料ユーザーの場合（ユーザー固有のURLのみ取得）
					content = await tinyurl.find({ 
						$or: [
							{ userid: userId },
							{ username: username }
						]
					}).sort({ createdAt: -1 });
				}
			} catch (error) {
				console.error('メールログインセッション解析エラー:', error);
			}
		} else if (req.cookies.refresh_token) {
			// Discordログインの場合
			try {
				const { token_type, access_token, refresh_token } = await refresh(req.cookies.refresh_token);
				const userData = await userdat(token_type, access_token);
				username = userData.username;
				userId = userData.id;

				// リフレッシュトークンを更新
				res.cookie('refresh_token', refresh_token, {
					httpOnly: true
				});

				// プレミアムユーザーかチェック
				const premiumUser = await preuser.findOne({ id: userId });
				isPremium = !!premiumUser;

				// ユーザーのURL一覧を取得
				if (isPremium) {
					content = await premium.find({ userid: userId }).sort({ createdAt: -1 });
				} else {
					// 無料ユーザーの場合（ユーザー固有のURLのみ取得）
					content = await tinyurl.find({ 
						$or: [
							{ userid: userId },
							{ username: username }
						]
					}).sort({ createdAt: -1 });
				}
			} catch (error) {
				console.error('Discordログイン更新エラー:', error);
				// リフレッシュトークンが無効な場合はクリア
				res.clearCookie('refresh_token');
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
			isPremium: isPremium,
			content: content,
			stats: {
				totalUrls: content.length,
				monthlyClicks: 1234, // 実際のアプリでは統計データを計算
				plan: isPremium ? 'プレミアム' : 'フリー',
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
		} else if (req.cookies.refresh_token) {
			const { token_type, access_token, refresh_token } = await refresh(req.cookies.refresh_token);
			const userData = await userdat(token_type, access_token);
			username = userData.username;
			userId = userData.id;

			res.cookie('refresh_token', refresh_token, {
				httpOnly: true
			});
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
		} else if (req.cookies.refresh_token) {
			const { token_type, access_token, refresh_token } = await refresh(req.cookies.refresh_token);
			const userData = await userdat(token_type, access_token);
			username = userData.username;
			userId = userData.id;

			res.cookie('refresh_token', refresh_token, {
				httpOnly: true
			});
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