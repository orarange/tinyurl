const mongoose = require('mongoose');
const Schema = mongoose.Schema

const premiumSchema = new Schema({
    original: String,
    tiny: String,
    userid: String,
});

module.exports = mongoose.model('premium', premiumSchema);