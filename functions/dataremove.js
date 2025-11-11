const mongoose = require('mongoose');
const User = require('../models/tinyurl');

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

async function dataRemove() {
	await User.remove({ __v: 0 }).then(x => console.log('removed'));
}

module.exports = {
	dataRemove
};