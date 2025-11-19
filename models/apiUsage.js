const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// JSTのタイムゾーンで現在時刻を返す関数
function getJSTDate() {
	const now = new Date();
	const jstOffset = 9 * 60; // JST = UTC+9
	const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
	return new Date(utc + (jstOffset * 60000));
}

const apiUsageSchema = new Schema({
	uniqueId: { type: String, required: true }, // ユーザーのuniqueId
	token: { type: String, required: true }, // 使用されたAPIトークン
	endpoint: { type: String, required: true }, // APIエンドポイント
	method: { type: String, required: true }, // HTTPメソッド
	statusCode: { type: Number }, // レスポンスステータスコード
	timestamp: { type: Date, default: getJSTDate },
	ipAddress: String, // リクエスト元IPアドレス
	userAgent: String // ユーザーエージェント
});

// インデックスを追加してクエリを高速化
apiUsageSchema.index({ uniqueId: 1, timestamp: -1 });
apiUsageSchema.index({ token: 1, timestamp: -1 });

module.exports = mongoose.model('apiUsage', apiUsageSchema);
