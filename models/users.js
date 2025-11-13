const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// JSTのタイムゾーンで現在時刻を返す関数
function getJSTDate() {
	const now = new Date();
	const jstOffset = 9 * 60; // JST = UTC+9
	const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
	return new Date(utc + (jstOffset * 60000));
}

const userdata = new Schema({
	id: String,
	uniqueId: { type: String, unique: true, required: true }, // 不変の一意ID
	username: String,
	email: String,
	password: String,
	createdAt: { type: Date, default: getJSTDate }
});

module.exports = mongoose.model('userdata', userdata);