const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require("body-parser")
const app = express();
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const cloudflare = require('cloudflare-express');
const fs = require('fs');



const remover = require('./functions/dataremove');



//サイト側のレンダリング用ルーター読み込み
const home = require('./routes/index');
const tiny = require('./routes/tiny');
const admin = require('./routes/admin');
const login = require('./routes/login');
const logout = require('./routes/logout');
const policy= require('./routes/policy');
const refe= require('./routes/refe');
const bata= require('./routes/bata');
const buy = require('./routes/buypremium');
const regiater = require('./routes/register');


//API用のルーター読み込み
const API1 = require('./APIs/index');
const pull = require('./APIs/pull');
const get = require('./APIs/geturl');
const gettiny = require('./APIs/gettiny');


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


const apiLimiter = rateLimit({
	windowMs: 10000 , // 30分
	max: 5, // 各IPを `window` ごとに50リクエストに制限する (ここでは、30分ごと)
	standardHeaders: true, // レートリミット情報を `RateLimit-*` ヘッダで返します。
	legacyHeaders: false, // X-RateLimit-*` ヘッダを無効にする。
})

const FileStreamRotator = require('file-stream-rotator')

const logDirectory = __dirname + '/log'

fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory)

const accessLogStream = FileStreamRotator.getStream({
    size:'10MB',//ファイルが10MBを超えるとローテートします
    interval: '10d',
    compress: 'gzip',
    path: logDirectory,
    filename:'Access_Log.txt'
});

// APIコールのみにレートリミットミドルウェアを適用する
app.use(cloudflare.restore());
app.use('/api', apiLimiter)
app.use('/api/make', apiLimiter)
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



//サイト用
app.use('/',home);
app.use('/t',tiny);
app.use('/login',login);
app.use('/logout',logout);
app.use('/admin',admin);
app.use('/policy',policy);
app.use('/api/reference',refe);
app.use('/bata/home',bata);
app.use('/buy',buy);
app.use('/register',regiater);

//API用
app.use('/api',API1)
app.use('/api/pull',pull)
app.use('/api/get',get)
app.use('/api/gettiny',gettiny)

//404ルーティング
app.use(function(req, res, next){
console.log(req.ip)
    console.log(req.cf_ip)
    fs.appendFile(accessLogStream, req.cf_ip, (err) => {
    });
    res.status(404).render('404', {title: "お探しのページは存在しません。"});
});

//月初めにデータを削除する
cron.schedule('0 16 1 * *', () => {
	remover.dataRemove();
});


app.listen(3030, function () {
    console.log('Example app listening on port 80!');
});
