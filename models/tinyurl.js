const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// JSTのタイムゾーンで現在時刻を返す関数
function getJSTDate() {
	const now = new Date();
	const jstOffset = 9 * 60; // JST = UTC+9
	const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
	return new Date(utc + (jstOffset * 60000));
}

const tinyurlSchema = new Schema({
	userid: String,          // MongoDB ObjectId (後方互換性のため保持)
	uniqueId: String,        // ユーザーのuniqueId（新規フィールド）
	username: String,
	original: String,
	tiny: { type: String, unique: true, required: true },
	isPremium: { type: Boolean, default: false },  // プレミアムユーザーが作成したか
	isCustom: { type: Boolean, default: false },   // カスタムURLか
	createdVia: { type: String, enum: ['web', 'api'], default: 'web' }, // 作成方法
	clicks: { type: Number, default: 0 },          // クリック数（将来の統計用）
	createdAt: { type: Date, default: getJSTDate }
});

// インデックスを追加してクエリを高速化
tinyurlSchema.index({ uniqueId: 1, createdAt: -1 });
tinyurlSchema.index({ tiny: 1 });

module.exports = mongoose.model('tinyurl', tinyurlSchema);