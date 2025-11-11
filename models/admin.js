const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const admin = new Schema({
	id: String,
	token: String
});

module.exports = mongoose.model('admin', admin);