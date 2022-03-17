var mongoose = require('mongoose');
var Schema = mongoose.Schema

var admin = new Schema({
    id:String,
    token:String
});

module.exports = mongoose.model('admin',admin);