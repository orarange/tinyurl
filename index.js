const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require("body-parser")
const app = express();
const axios = require('axios');
const rateLimit = require('express-rate-limit');



//サイト側のレンダリング用ルーター読み込み
const home = require('./routes/index');
const tiny = require('./routes/tiny');
const admin = require('./routes/admin');
const login = require('./routes/login');
const policy= require('./routes/policy');
const refe= require('./routes/refe');
const bata= require('./routes/bata');
const buy = require('./routes/buypremium');
const regiater = require('./routes/register');

//API用のルーター読み込み
const API1 = require('./APIs/index');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 50, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Apply the rate limiting middleware to API calls only
app.use('/api', apiLimiter)
app.use('/api/tiny_url', apiLimiter)
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//サイト用
app.use('/',home);
app.use('/t',tiny);
app.use('/login',login);
app.use('/admin',admin);
app.use('/policy',policy);
app.use('/api/reference',refe);
app.use('/bata/home',bata);
app.use('/buy',buy);
app.use('/register',regiater);

//API用
app.use('/api',API1)

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});