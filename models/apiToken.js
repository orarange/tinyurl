const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// JSTのタイムゾーンで現在時刻を返す関数
function getJSTDate() {
	const now = new Date();
	const jstOffset = 9 * 60; // JST = UTC+9
	const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
	return new Date(utc + (jstOffset * 60000));
}

const apiTokenSchema = new Schema({
	uniqueId: { type: String, required: true }, // ユーザーのuniqueId
	token: { type: String, required: true, unique: true }, // APIトークン
	name: { type: String, default: 'Default Token' }, // トークンの名前
	lastUsed: { type: Date, default: null }, // 最終使用日時
	createdAt: { type: Date, default: getJSTDate },
	isActive: { type: Boolean, default: true } // トークンの有効/無効
});

module.exports = mongoose.model('apiToken', apiTokenSchema);
