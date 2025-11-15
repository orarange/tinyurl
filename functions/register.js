const User = require('../models/users');

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