var mongoose = require('mongoose');
var Schema = mongoose.Schema

var tinyurlSchema = new Schema({
    original:String,
    tiny:String,
});

module.exports = mongoose.model('tinyurl',tinyurlSchema);