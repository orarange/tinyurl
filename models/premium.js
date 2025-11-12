const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const premiumSchema = new Schema({
	original: String,
	tiny: String,
	userid: String,
	username: String,
	createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('premium', premiumSchema);