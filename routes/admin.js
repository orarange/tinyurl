const fetch = require('node-fetch');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const tinyurl = require('../models/tinyurl')
const preuser = require('../models/preuser')
const premium = require('../models/premium')
const admin = require('../models/admin')
const refresh = require('../functions/refresh');
const userdat = require('../functions/userdata');

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect(process.env.mongo_url);
}



router.get('/', async (req, res) => {
    const { token_type, access_token, refresh_token } = await refresh(req.cookies.refresh_token);
    const { username, id } = await userdat(token_type, access_token)

    admin.findOne({ id: id }).then(d => {
        if (!d) {

            console.log('not admin')
            console.log(req.cf_ip)
            res.status(403).send('ページへのアクセス権限がありません。');

        } else {
            console.log(`admin:${username}`)
            tinyurl.find({}, function (err, docs) {
                const data = {
                    content: docs
                };
                res.status(200).render('dash', data);
            });

            res.cookie('refresh_token', refresh_token, {
                httpOnly: true
            });

        }
    });



});

router.post('/alldelete', async function (req, res) {
    const { token_type, access_token, refresh_token } = await refresh(req.cookies.refresh_token);
    const { username, id } = await userdat(token_type, access_token)

    admin.findOne({ id: id }).then(d => {
        if (!d) {

            console.log('not admin')

            res.status(403).send('ページへのアクセス権限がありません。');

        } else {
            console.log(`admin:${username}`)
            tinyurl.remove({ __v: 0 }).then(x => console.log(x.deletedCount))

            res.cookie('refresh_token', refresh_token, {
                httpOnly: true
            });

        }
    });

})

router.post('/delete', function (req, res) {
    let str = req.body.delnum;
    const str2 = Array.isArray(str);
    if (str2) {
        for (let i in str) {
            tinyurl.remove({ tiny: str[i] }).then(x => console.log(x.deletedCount))
            console.log(str2)
        }
    } else {
        tinyurl.remove({ tiny: str }).then(x => console.log(x.deletedCount))
        console.log(str2)
    }
    res.status(301).redirect('/admin')
})

router.post('/premiumadd', async (req, res) => {
    const token = Math.random().toString(32).substring(2)
    const { id, demo } = req.body;
    console.log(req.body)
    if (id) {
        if (demo) {
            const _preuser = new preuser({
                id: id,
                demo: true
            });
            _preuser.save();
        } else {
            const _preuser = new preuser({
                id: id,
                demo: false
            });
            _preuser.save();
        }
    }
    res.status(301).redirect('/admin')
})

module.exports = router;
