const fetch = require('node-fetch');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const tinyurl = require('../models/users');


main().catch(err => console.log(err));

async function main() {
    await mongoose.connect(process.env.mongo_url);
}



router.get('/', async (req, res) => {
    if (!req.cookies.refresh_token || req.cookies.refresh_token === "undefined") {
        res.render('register', { url: '' ,tiny:'',premiu:'',name:'',demo:'',log:'in'});
    }else {
        res.redirect('/');
    }
});

router.post('/', async (req, res) => {
    const { username, email, password } = req.body;
    const user = new tinyurl({
        username: username,
        email: email,
        password: password
    });
    user.save().then(() => {
        res.redirect('/');
    }
    ).catch(err => {
        res.send(err);
    }
    );
}
);

module.exports = router;