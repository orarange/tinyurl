const apiToken = require('../models/apiToken');
const apiUsage = require('../models/apiUsage');
const { checkApiLimit } = require('./usageLimits');

/**
 * APIトークン認証ミドルウェア
 */
async function authenticateToken(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"形式を想定

	if (!token) {
		return res.status(401).json({
			error: 'Unauthorized',
			message: 'APIトークンが必要です。Authorization: Bearer <token> ヘッダーを含めてください。'
		});
	}

	try {
		// トークンを検証
		const tokenDoc = await apiToken.findOne({ token: token, isActive: true });

		if (!tokenDoc) {
			return res.status(403).json({
				error: 'Forbidden',
				message: '無効または期限切れのトークンです。'
			});
		}

		// 使用量制限をチェック
		const limitCheck = await checkApiLimit(tokenDoc.uniqueId);
		
		if (!limitCheck.allowed) {
			return res.status(429).json({
				error: 'Too Many Requests',
				message: `今月のAPI使用制限（${limitCheck.limit}回）に達しました。来月またはプレミアムプランへのアップグレードをご検討ください。`,
				limit: limitCheck.limit,
				current: limitCheck.current
			});
		}

		// リクエストにユーザー情報を追加
		req.user = {
			uniqueId: tokenDoc.uniqueId,
			token: token
		};

		// 最終使用日時を更新
		tokenDoc.lastUsed = new Date();
		await tokenDoc.save();

		next();
	} catch (error) {
		console.error('Token authentication error:', error);
		return res.status(500).json({
			error: 'Internal Server Error',
			message: '認証処理中にエラーが発生しました。'
		});
	}
}

/**
 * API使用履歴を記録するミドルウェア
 */
function logApiUsage(req, res, next) {
	// レスポンス送信後に使用履歴を記録
	const originalSend = res.send;
	res.send = function (data) {
		// レスポンスを送信
		originalSend.call(this, data);

		// 非同期で使用履歴を記録（エラーが発生してもレスポンスには影響しない）
		if (req.user) {
			const usage = new apiUsage({
				uniqueId: req.user.uniqueId,
				token: req.user.token,
				endpoint: req.originalUrl || req.url,
				method: req.method,
				statusCode: res.statusCode,
				ipAddress: req.ip || req.connection.remoteAddress,
				userAgent: req.headers['user-agent']
			});

			usage.save().catch(err => {
				console.error('API usage logging error:', err);
			});
		}
	};

	next();
}

module.exports = {
	authenticateToken,
	logApiUsage
};
