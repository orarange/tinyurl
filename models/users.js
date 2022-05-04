const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userdata = new Schema({
    id: String,
    username: String,
    email: String,
    password: String,
});


module.exports = mongoose.model('userdata', userdata);