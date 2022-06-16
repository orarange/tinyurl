var mongoose = require('mongoose');
var Schema = mongoose.Schema

var premium_user_add = new Schema({
    id: String,
    demo: Boolean
});

module.exports = mongoose.model('preuseradd', premium_user_add);