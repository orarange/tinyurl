const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const tinyurl = require('../models/tinyurl');
const preuser = require('../models/preuser');
const apiToken = require('../models/apiToken');
const apiUsage = require('../models/apiUsage');
const crypto = require('crypto');

function parseSession(req) {
	const raw = req.signedCookies.user_session;
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

router.get('/', async (req, res) => {
	try {
		const userSession = parseSession(req);
		if (!userSession) {
			return res.redirect('/login');
		}

		const { username, id: userId, uniqueId } = userSession;

		const premiumUser = await preuser.findOne({ id: uniqueId });
		const premiu = premiumUser ? 'yes' : '';

		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;
		const skip = (page - 1) * limit;

		const content = await tinyurl.find({ uniqueId })
			.sort({ createdAt: -1 })
			.limit(limit)
			.skip(skip);

		const totalUrls = await tinyurl.countDocuments({ uniqueId });
		const totalPages = Math.ceil(totalUrls / limit);

		const apiTokens = await apiToken.find({ uniqueId }).sort({ createdAt: -1 });

		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);
		const apiUsageCount = await apiUsage.countDocuments({
			uniqueId,
			timestamp: { $gte: startOfMonth }
		});

		return res.render('dash', {
			name: username,
			userId,
			premiu,
			content,
			apiTokens,
			apiUsageCount,
			pagination: {
				currentPage: page,
				totalPages,
				limit,
				totalUrls
			},
			stats: {
				totalUrls,
				monthlyClicks: 0,
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

router.post('/delete', async (req, res) => {
	try {
		const userSession = parseSession(req);
		if (!userSession) {
			return res.redirect('/login');
		}

		const { username, uniqueId } = userSession;
		if (!username || !uniqueId) {
			return res.redirect('/login');
		}

		const { delnum } = req.body;
		if (delnum) {
			const urlsToDelete = Array.isArray(delnum) ? delnum : [delnum];

			const apiCreatedCount = await tinyurl.countDocuments({
				tiny: { $in: urlsToDelete },
				uniqueId,
				createdVia: 'api'
			});

			await tinyurl.deleteMany({
				tiny: { $in: urlsToDelete },
				uniqueId
			});

			if (apiCreatedCount > 0) {
				const apiUsagesToDelete = await apiUsage.find({
					uniqueId,
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

		res.redirect('/dashboard');

	} catch (error) {
		console.error('URL削除エラー:', error);
		res.status(500).json({ error: 'URL削除中にエラーが発生しました' });
	}
});

router.post('/delete-all', async (req, res) => {
	try {
		const userSession = parseSession(req);
		if (!userSession) {
			return res.redirect('/login');
		}

		const { username, uniqueId } = userSession;
		if (!username || !uniqueId) {
			return res.redirect('/login');
		}

		const apiCreatedCount = await tinyurl.countDocuments({ uniqueId, createdVia: 'api' });

		await tinyurl.deleteMany({ uniqueId });

		if (apiCreatedCount > 0) {
			const apiUsagesToDelete = await apiUsage.find({
				uniqueId,
				endpoint: '/api/make',
				method: 'POST'
			})
				.sort({ timestamp: -1 })
				.limit(apiCreatedCount)
				.select('_id');

			const idsToDelete = apiUsagesToDelete.map(doc => doc._id);
			await apiUsage.deleteMany({ _id: { $in: idsToDelete } });
		}

		res.redirect('/dashboard');

	} catch (error) {
		console.error('全URL削除エラー:', error);
		res.status(500).json({ error: '全URL削除中にエラーが発生しました' });
	}
});

router.post('/api-token/create', async (req, res) => {
	try {
		const userSession = parseSession(req);
		if (!userSession || !userSession.uniqueId) {
			return res.redirect('/login');
		}

		const { uniqueId } = userSession;
		const token = 'turl_' + crypto.randomBytes(32).toString('hex');
		const tokenName = req.body.tokenName || 'Default Token';

		const newToken = new apiToken({
			uniqueId,
			token,
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

router.post('/api-token/delete', async (req, res) => {
	try {
		const userSession = parseSession(req);
		if (!userSession || !userSession.uniqueId) {
			return res.redirect('/login');
		}

		const { uniqueId } = userSession;
		const { tokenId } = req.body;

		if (!tokenId || !mongoose.Types.ObjectId.isValid(tokenId)) {
			return res.status(400).send('無効なトークンIDです');
		}

		await apiToken.deleteOne({
			_id: new mongoose.Types.ObjectId(tokenId),
			uniqueId
		});

		console.log(`API token deleted: ${tokenId}`);
		res.redirect('/dashboard');

	} catch (error) {
		console.error('APIトークン削除エラー:', error);
		res.status(500).send('APIトークン削除中にエラーが発生しました');
	}
});

module.exports = router;
