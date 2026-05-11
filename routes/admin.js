const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const preuser = require('../models/preuser');
const premium = require('../models/premium');
const users = require('../models/users');

async function authenticateAdmin(req) {
	let currentUser = null;
	let username = '';
	let userId = '';

	const raw = req.signedCookies.user_session;
	if (raw) {
		try {
			const sessionData = JSON.parse(raw);
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

	const adminUniqueIds = process.env.admin_unique_ids || process.env.ADMIN_UNIQUE_IDS;
	if (!adminUniqueIds) {
		return { success: false, error: '管理者設定が不正です' };
	}

	const adminUniqueIdList = adminUniqueIds.split(',').map(id => id.trim());
	if (!currentUser.uniqueId || !adminUniqueIdList.includes(currentUser.uniqueId)) {
		console.log(`Access denied for user uniqueID: ${currentUser.uniqueId}, Admin uniqueIDs: ${adminUniqueIdList}`);
		return { success: false, error: '管理者権限が必要です' };
	}

	return {
		success: true,
		user: currentUser,
		username,
		userId
	};
}

router.get('/', async (req, res) => {
	try {
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

		const freeUrls = await tinyurl.find().sort({ createdAt: -1 });
		const premiumUrls = await premium.find().sort({ createdAt: -1 });

		const allUrls = [...freeUrls, ...premiumUrls].sort((a, b) => {
			const dateA = new Date(a.createdAt || 0);
			const dateB = new Date(b.createdAt || 0);
			return dateB - dateA;
		});

		const premiumUserCount = await preuser.countDocuments();

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(today.getDate() + 1);

		const todayUrlsCount = await tinyurl.countDocuments({
			createdAt: { $gte: today, $lt: tomorrow }
		}) + await premium.countDocuments({
			createdAt: { $gte: today, $lt: tomorrow }
		});

		const allUsers = await users.find().sort({ createdAt: -1 });

		console.log(`Admin access - Total URLs: ${allUrls.length}, Today: ${todayUrlsCount}, Users: ${allUsers.length}`);

		res.render('admin', {
			content: allUrls,
			users: allUsers,
			totalUrls: allUrls.length,
			totalUsers: allUsers.length,
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
		const authResult = await authenticateAdmin(req);
		if (!authResult.success) {
			return res.status(authResult.error === '認証が必要です' ? 401 : 403).send(authResult.error);
		}

		const { user: currentUser, username } = authResult;
		console.log(`Admin mass delete by: ${username} (uniqueID: ${currentUser.uniqueId})`);
		const result = await tinyurl.deleteMany({});
		console.log(`Deleted ${result.deletedCount} URLs`);

		res.status(301).redirect('/admin');

	} catch (error) {
		console.error('Mass delete error:', error);
		res.status(500).send('削除中にエラーが発生しました。');
	}
});

router.post('/delete', async function (req, res) {
	try {
		const authResult = await authenticateAdmin(req);
		if (!authResult.success) {
			return res.status(authResult.error === '認証が必要です' ? 401 : 403).send(authResult.error);
		}

		const { user: currentUser, username } = authResult;

		let str = req.body.delnum;
		const str2 = Array.isArray(str);

		if (str2) {
			for (let i in str) {
				await tinyurl.deleteOne({ tiny: str[i] });
				await premium.deleteOne({ tiny: str[i] });
			}
			console.log(`Admin ${username} (uniqueID: ${currentUser.uniqueId}) deleted ${str.length} URLs`);
		} else {
			await tinyurl.deleteOne({ tiny: str });
			await premium.deleteOne({ tiny: str });
			console.log(`Admin ${username} (uniqueID: ${currentUser.uniqueId}) deleted URL: ${str}`);
		}

		res.status(301).redirect('/admin');

	} catch (error) {
		console.error('Delete error:', error);
		res.status(500).send('削除中にエラーが発生しました。');
	}
});

router.post('/premiumadd', async (req, res) => {
	try {
		const authResult = await authenticateAdmin(req);
		if (!authResult.success) {
			return res.status(authResult.error === '認証が必要です' ? 401 : 403).send(authResult.error);
		}

		const { user: currentUser, username } = authResult;

		const { id, demo } = req.body;
		console.log(`Admin ${username} (uniqueID: ${currentUser.uniqueId}) adding premium for user:`, req.body);

		if (id) {
			const targetUser = await users.findOne({ uniqueId: id });
			if (!targetUser) {
				console.log(`User with uniqueId ${id} not found`);
				return res.status(400).send('指定されたuniqueIdのユーザーが見つかりません。');
			}

			const existingPremium = await preuser.findOne({ id });
			if (existingPremium) {
				console.log(`User ${id} is already premium`);
				return res.status(400).send('このユーザーは既にプレミアムユーザーです。');
			}

			const _preuser = new preuser({
				id,
				demo: demo === 'true' || demo === true
			});
			await _preuser.save();
			console.log(`Premium status added for user uniqueId: ${id}, demo: ${demo}`);
		}

		res.status(301).redirect('/admin');

	} catch (error) {
		console.error('Premium add error:', error);
		res.status(500).send('プレミアム追加中にエラーが発生しました。');
	}
});

router.post('/delete-user', async (req, res) => {
	try {
		const authResult = await authenticateAdmin(req);
		if (!authResult.success) {
			return res.status(authResult.error === '認証が必要です' ? 401 : 403).json({ error: authResult.error });
		}

		const { user: currentUser, username } = authResult;

		const { userId } = req.body;

		if (!userId) {
			return res.status(400).json({ error: 'ユーザーIDが必要です' });
		}

		const user = await users.findById(userId);
		if (!user) {
			return res.status(404).json({ error: 'ユーザーが見つかりません' });
		}

		if (user.uniqueId) {
			await tinyurl.deleteMany({ userid: user.uniqueId });
			await premium.deleteMany({ userid: user.uniqueId });
			await preuser.deleteMany({ id: user.uniqueId });
		}

		await users.findByIdAndDelete(userId);

		console.log(`Admin ${username} (uniqueID: ${currentUser.uniqueId}) deleted user: ${user.username || user.email || user.uniqueId}`);

		res.json({ success: true, message: 'ユーザーが削除されました' });

	} catch (error) {
		console.error('User deletion error:', error);
		res.status(500).json({ error: 'ユーザー削除中にエラーが発生しました' });
	}
});

module.exports = router;
