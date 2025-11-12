const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tinyurlSchema = new Schema({
	userid: String,
	username: String,
	original: String,
	tiny: String,
	createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('tinyurl', tinyurlSchema);