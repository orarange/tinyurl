const mongoose = require('mongoose');
const User = require('../models/users');

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

async function getUsers(email) {
	if (!email) {
		return null;
	} else {
		const user = await User.findOne({ email: email });
		if (!user) {
			return 'unregistered';
		} else {
			return 'registered';
		}
	}
}

module.exports = {
	getUsers
};