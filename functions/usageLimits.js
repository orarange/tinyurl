const tinyurl = require('../models/tinyurl');
const preuser = require('../models/preuser');
const apiUsage = require('../models/apiUsage');

// 使用量制限の定義
const LIMITS = {
	FREE: {
		urls: 1000,           // 月間URL作成数
		apiCalls: 1000      // 月間API呼び出し数
	},
	PREMIUM: {
		urls: Infinity,     // 無制限
		apiCalls: 10000     // 月間10,000回
	}
};

/**
 * 今月の開始日を取得
 */
function getStartOfMonth() {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * ユーザーの今月のURL作成数を取得（Web + API）
 */
async function getMonthlyUrlCount(uniqueId, isPremium) {
	const startOfMonth = getStartOfMonth();
	
	// 統合モデルからWeb + API両方の作成数を取得
	return await tinyurl.countDocuments({
		uniqueId: uniqueId,
		createdAt: { $gte: startOfMonth }
	});
}

/**
 * ユーザーの今月のAPI使用回数を取得
 */
async function getMonthlyApiUsage(uniqueId) {
	const startOfMonth = getStartOfMonth();
	
	return await apiUsage.countDocuments({
		uniqueId: uniqueId,
		timestamp: { $gte: startOfMonth }
	});
}

/**
 * URL作成制限をチェック
 */
async function checkUrlLimit(uniqueId) {
	try {
		// プレミアムユーザーかチェック
		const premiumUser = await preuser.findOne({ id: uniqueId });
		const isPremium = !!premiumUser;
		
		// 今月の作成数を取得
		const monthlyCount = await getMonthlyUrlCount(uniqueId, isPremium);
		
		// 制限を取得
		const limit = isPremium ? LIMITS.PREMIUM.urls : LIMITS.FREE.urls;
		
		return {
			allowed: monthlyCount < limit,
			current: monthlyCount,
			limit: limit,
			isPremium: isPremium
		};
	} catch (error) {
		console.error('URL limit check error:', error);
		return {
			allowed: false,
			current: 0,
			limit: 0,
			isPremium: false,
			error: error.message
		};
	}
}

/**
 * API使用制限をチェック
 */
async function checkApiLimit(uniqueId) {
	try {
		// プレミアムユーザーかチェック
		const premiumUser = await preuser.findOne({ id: uniqueId });
		const isPremium = !!premiumUser;
		
		// 今月の使用回数を取得
		const monthlyCount = await getMonthlyApiUsage(uniqueId);
		
		// 制限を取得
		const limit = isPremium ? LIMITS.PREMIUM.apiCalls : LIMITS.FREE.apiCalls;
		
		return {
			allowed: monthlyCount < limit,
			current: monthlyCount,
			limit: limit,
			isPremium: isPremium
		};
	} catch (error) {
		console.error('API limit check error:', error);
		return {
			allowed: false,
			current: 0,
			limit: 0,
			isPremium: false,
			error: error.message
		};
	}
}

module.exports = {
	LIMITS,
	checkUrlLimit,
	checkApiLimit,
	getMonthlyUrlCount,
	getMonthlyApiUsage
};
