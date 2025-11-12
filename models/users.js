const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userdata = new Schema({
	id: String,
	uniqueId: { type: String, unique: true, required: true }, // 不変の一意ID
	username: String,
	email: String,
	password: String,
	createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('userdata', userdata);