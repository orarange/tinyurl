const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tinyurlSchema = new Schema({
	original: String,
	tiny: String,
});

module.exports = mongoose.model('tinyurl', tinyurlSchema);