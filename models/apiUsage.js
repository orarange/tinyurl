const mongoose = require('mongoose');
const Schema = mongoose.Schema;

function getJSTDate() {
	const now = new Date();
	const jstOffset = 9 * 60;
	const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
	return new Date(utc + (jstOffset * 60000));
}

const apiUsageSchema = new Schema({
	uniqueId: { type: String, required: true },
	token: { type: String, required: true },
	endpoint: { type: String, required: true },
	method: { type: String, required: true },
	statusCode: { type: Number },
	timestamp: { type: Date, default: getJSTDate },
	ipAddress: String,
	userAgent: String
});

apiUsageSchema.index({ uniqueId: 1, timestamp: -1 });
apiUsageSchema.index({ token: 1, timestamp: -1 });
// 30日後に自動削除
apiUsageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('apiUsage', apiUsageSchema);
