const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const app = express();
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const cloudflare = require('cloudflare-express');
const fs = require('fs');
const mongoose = require('mongoose');

require('dotenv').config();
require('date-utils');

// MongoDB接続を一元化
mongoose.connect(process.env.mongo_url)
	.then(() => console.log('MongoDB connected'))
	.catch(err => console.error('MongoDB connection error:', err));

const remover = require('./functions/dataremove');

const home = require('./routes/index');
const tiny = require('./routes/tiny');
const admin = require('./routes/admin');
const dashboard = require('./routes/dash');
const login = require('./routes/login');
const logout = require('./routes/logout');
const policy = require('./routes/policy');
const privacy = require('./routes/privacy');
const contact = require('./routes/contact');
const about = require('./routes/about');
const refe = require('./routes/refe');
const buy = require('./routes/buypremium');
const regiater = require('./routes/register');

const API1 = require('./APIs/index');
const pull = require('./APIs/pull');
const get = require('./APIs/geturl');
const gettiny = require('./APIs/gettiny');


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const apiLimiter = rateLimit({
	windowMs: 10000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
});

app.use(cloudflare.restore());
app.use('/api', apiLimiter);
app.use('/api/make', apiLimiter);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
	console.log(req.cf_ip);
	next();
});

app.use('/', home);
app.use('/t', tiny);
app.use('/login', login);
app.use('/logout', logout);
app.use('/admin', admin);
app.use('/api/reference', refe);
app.use('/buy', buy);
app.use('/register', regiater);
app.use('/dashboard', dashboard);
app.use('/policy', policy);
app.use('/privacy', privacy);
app.use('/contact', contact);
app.use('/about', about);
app.use('/sitemap.xml', function (req, res) {
	res.sendFile(__dirname + '/sitemap.xml');
});
app.use('/robots.txt', function (req, res) {
	res.sendFile(__dirname + '/robots.txt');
});

app.use('/api', API1);
app.use('/api/pull', pull);
app.use('/api/get', get);
app.use('/api/gettiny', gettiny);

app.use(function (req, res, next) {
	console.log(req.cf_ip);
	var date = new Date();
	var date_str = date.toFormat("YYYY/MM/DD") + " " + (Number(date.toFormat("HH")) + 9) + date.toFormat(":MI:SS");
	var log = date_str + " " + req.url + " 404 Not Found " + req.cf_ip + "\n";
	fs.appendFile('./log/' + new Date().toFormat("YYYY.MM.DD") + '.log', log, function (err) { });
	res.status(404).render('404');
	next();
});

cron.schedule('0 16 1 * *', () => {
	remover.dataRemove();
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
	console.log(`Example app listening on port ${PORT}!`);
});
