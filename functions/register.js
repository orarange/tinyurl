const mongoose = require('mongoose');
const User = require('../models/users');

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

async function getUsers(email) {
	if (!email) {
		return null;
	} else {
		User.findOne({ email: email }).then(d => {
			if (!d) {
				return 'unregistered';
			} else {
				return 'registered';
			}
		});
	}
}

module.exports = {
	getUsers
};