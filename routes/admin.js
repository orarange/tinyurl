const fetch = require('node-fetch');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const tinyurl = require('../models/tinyurl');
const preuser = require('../models/preuser');
const premium = require('../models/premium');
const admin = require('../models/admin');
const users = require('../models/users');
const refresh = require('../functions/refresh');
const userdat = require('../functions/userdata');

main().catch(err => console.log(err));

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

// 管理者認証ヘルパー関数
async function authenticateAdmin(req) {
	let currentUser = null;
	let username = '';
	let userId = '';
	let refreshToken = null;

	// Discord認証またはメール認証をチェック
	if (req.cookies.refresh_token && req.cookies.refresh_token !== 'undefined') {
		// Discord認証の場合
		try {
			const { token_type, access_token, refresh_token } = await refresh(req.cookies.refresh_token);
			const discordUser = await userdat(token_type, access_token);
			// Discord IDでDBユーザーを検索
			currentUser = await users.findOne({ id: discordUser.id });
			username = discordUser.username;
			userId = discordUser.id;
			refreshToken = refresh_token;
		} catch (error) {
			console.log('Discord auth failed:', error.message);
		}
	} else if (req.cookies.user_session) {
		// メール認証の場合
		try {
			const sessionData = JSON.parse(req.cookies.user_session);
			currentUser = await users.findById(sessionData.id);
			username = sessionData.username;
			userId = sessionData.id;
		} catch (error) {
			console.log('Session auth failed:', error.message);
		}
	}

	if (!currentUser) {
		return { success: false, error: '認証が必要です' };
	}

	// 環境変数から管理者uniqueIDリストを取得
	const adminUniqueIds = process.env.admin_unique_ids || process.env.ADMIN_UNIQUE_IDS;
	if (!adminUniqueIds) {
		return { success: false, error: '管理者設定が不正です' };
	}

	// 管理者uniqueIDをチェック（複数IDに対応）
	const adminUniqueIdList = adminUniqueIds.split(',').map(id => id.trim());
	if (!currentUser.uniqueId || !adminUniqueIdList.includes(currentUser.uniqueId)) {
		console.log(`Access denied for user uniqueID: ${currentUser.uniqueId}, Admin uniqueIDs: ${adminUniqueIdList}`);
		return { success: false, error: '管理者権限が必要です' };
	}

	return {
		success: true,
		user: currentUser,
		username: username,
		userId: userId,
		refreshToken: refreshToken
	};
}

router.get('/', async (req, res) => {
	try {
		// 管理者認証機能（DB uniqueIDベース）
		const authResult = await authenticateAdmin(req);
		if (!authResult.success) {
			if (authResult.error === '認証が必要です') {
				return res.status(401).send('認証が必要です。ログインしてください。');
			} else if (authResult.error === '管理者設定が不正です') {
				console.error('admin_unique_ids environment variable is not set');
				return res.status(500).send('管理者設定が不正です。');
			} else {
				return res.status(403).send(authResult.error);
			}
		}

		const { user: currentUser, username } = authResult;
		console.log(`Admin access granted for: ${username} (uniqueID: ${currentUser.uniqueId})`);

		// 全URLデータを取得（フリー + プレミアム）
		const freeUrls = await tinyurl.find().sort({ createdAt: -1 });
		const premiumUrls = await premium.find().sort({ createdAt: -1 });
		
		// 統合してソート
		const allUrls = [...freeUrls, ...premiumUrls].sort((a, b) => {
			const dateA = new Date(a.createdAt || 0);
			const dateB = new Date(b.createdAt || 0);
			return dateB - dateA;
		});

		// 統計データの計算
		const totalUsers = await tinyurl.distinct('userid').length + await premium.distinct('userid').length;
		const premiumUserCount = await preuser.countDocuments();

		// 今日作成されたURLの数を計算
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(today.getDate() + 1);
		
		const todayUrlsCount = await tinyurl.countDocuments({
			createdAt: { $gte: today, $lt: tomorrow }
		}) + await premium.countDocuments({
			createdAt: { $gte: today, $lt: tomorrow }
		});

		// 全ユーザー情報を取得
		const allUsers = await users.find().sort({ createdAt: -1 });

		console.log(`Admin access - Total URLs: ${allUrls.length}, Today: ${todayUrlsCount}, Users: ${allUsers.length}`);

		res.render('admin', {
			content: allUrls,
			users: allUsers,
			totalUrls: allUrls.length,
			totalUsers: totalUsers,
			premiumUsers: premiumUserCount,
			todayUrls: todayUrlsCount,
			url: '',
			tiny: '',
			premiu: '',
			name: 'Administrator',
			demo: ''
		});

	} catch (error) {
		console.error('Admin page error:', error);
		res.status(500).send('管理画面の読み込み中にエラーが発生しました。');
	}
});

router.post('/alldelete', async function (req, res) {
	try {
		// 管理者認証
		const authResult = await authenticateAdmin(req);
		if (!authResult.success) {
			return res.status(authResult.error === '認証が必要です' ? 401 : 403).send(authResult.error);
		}

		const { user: currentUser, username, refreshToken } = authResult;
		console.log(`Admin mass delete by: ${username} (uniqueID: ${currentUser.uniqueId})`);
		const result = await tinyurl.deleteMany({});
		console.log(`Deleted ${result.deletedCount} URLs`);

		// Discord認証の場合のみrefresh_tokenを更新
		if (refreshToken) {
			res.cookie('refresh_token', refreshToken, {
				httpOnly: true
			});
		}

		res.status(301).redirect('/admin');

	} catch (error) {
		console.error('Mass delete error:', error);
		res.status(500).send('削除中にエラーが発生しました。');
	}
});

router.post('/delete', async function (req, res) {
	try {
		// 管理者認証
		const authResult = await authenticateAdmin(req);
		if (!authResult.success) {
			return res.status(authResult.error === '認証が必要です' ? 401 : 403).send(authResult.error);
		}

		const { user: currentUser, username, refreshToken } = authResult;

		let str = req.body.delnum;
		const str2 = Array.isArray(str);
		
		if (str2) {
			for (let i in str) {
				// tinyurlコレクションから削除
				await tinyurl.deleteOne({ tiny: str[i] });
				// premiumコレクションからも削除
				await premium.deleteOne({ tiny: str[i] });
			}
			console.log(`Admin ${username} (uniqueID: ${currentUser.uniqueId}) deleted ${str.length} URLs`);
		} else {
			// tinyurlコレクションから削除
			await tinyurl.deleteOne({ tiny: str });
			// premiumコレクションからも削除
			await premium.deleteOne({ tiny: str });
			console.log(`Admin ${username} (uniqueID: ${currentUser.uniqueId}) deleted URL: ${str}`);
		}

		// Discord認証の場合のみrefresh_tokenを更新
		if (refreshToken) {
			res.cookie('refresh_token', refreshToken, {
				httpOnly: true
			});
		}

		res.status(301).redirect('/admin');

	} catch (error) {
		console.error('Delete error:', error);
		res.status(500).send('削除中にエラーが発生しました。');
	}
});

router.post('/premiumadd', async (req, res) => {
	try {
		// 管理者認証
		const authResult = await authenticateAdmin(req);
		if (!authResult.success) {
			return res.status(authResult.error === '認証が必要です' ? 401 : 403).send(authResult.error);
		}

		const { user: currentUser, username, refreshToken } = authResult;

		const { id, demo } = req.body;
		console.log(`Admin ${username} (uniqueID: ${currentUser.uniqueId}) adding premium for user:`, req.body);
		
		if (id) {
			const _preuser = new preuser({
				id: id,
				demo: demo === 'true' || demo === true
			});
			await _preuser.save();
			console.log(`Premium status added for user ${id}, demo: ${demo}`);
		}

		// Discord認証の場合のみrefresh_tokenを更新
		if (refreshToken) {
			res.cookie('refresh_token', refreshToken, {
				httpOnly: true
			});
		}

		res.status(301).redirect('/admin');

	} catch (error) {
		console.error('Premium add error:', error);
		res.status(500).send('プレミアム追加中にエラーが発生しました。');
	}
});

// ユーザー削除機能
router.post('/delete-user', async (req, res) => {
	try {
		// 管理者認証
		const authResult = await authenticateAdmin(req);
		if (!authResult.success) {
			return res.status(authResult.error === '認証が必要です' ? 401 : 403).json({ error: authResult.error });
		}

		const { user: currentUser, username, refreshToken } = authResult;

		const { userId } = req.body;
		
		if (!userId) {
			return res.status(400).json({ error: 'ユーザーIDが必要です' });
		}

		// ユーザーを取得してDiscord IDを確認
		const user = await users.findById(userId);
		if (!user) {
			return res.status(404).json({ error: 'ユーザーが見つかりません' });
		}

		// ユーザーのURLを削除（Discord IDまたはuniqueIdで検索）
		if (user.id) {
			await tinyurl.deleteMany({ userid: user.id });
			await premium.deleteMany({ userid: user.id });
		}
		if (user.uniqueId) {
			await tinyurl.deleteMany({ userid: user.uniqueId });
			await premium.deleteMany({ userid: user.uniqueId });
		}

		// プレミアムユーザー情報を削除
		if (user.id) {
			await preuser.deleteMany({ id: user.id });
		}

		// ユーザーを削除
		await users.findByIdAndDelete(userId);

		console.log(`Admin ${username} (uniqueID: ${currentUser.uniqueId}) deleted user: ${user.username || user.email || user.id}`);
		
		// Discord認証の場合のみrefresh_tokenを更新
		if (refreshToken) {
			res.cookie('refresh_token', refreshToken, {
				httpOnly: true
			});
		}

		res.json({ success: true, message: 'ユーザーが削除されました' });

	} catch (error) {
		console.error('User deletion error:', error);
		res.status(500).json({ error: 'ユーザー削除中にエラーが発生しました' });
	}
});

module.exports = router;
