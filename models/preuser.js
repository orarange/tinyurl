const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const premium_user_add = new Schema({
	id: String,
	demo: Boolean
});

module.exports = mongoose.model('preuseradd', premium_user_add);