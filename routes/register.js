const fetch = require('node-fetch');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const tinyurl = require('../models/users');
const getUsers = require('../functions/register');


main().catch(err => console.log(err));

async function main() {
    await mongoose.connect(process.env.mongo_url);
}



router.get('/', async (req, res) => {
    if (!req.cookies.refresh_token || req.cookies.refresh_token === "undefined") {
        res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in' });
    } else {
        res.redirect('/');
    }
});

router.post('/', async (req, res) => {
    const { username, email, password } = req.body;
    const register = getUsers.getUsers(email);
    register.then(async (result) => {
        if (result === 'unregistered') {
            const user = new tinyurl({
                username: username,
                email: email,
                password: password
            });
            user.save().then(() => {
                res.redirect('/');
                console.log('user created');
            }
            ).catch(err => {
                res.send(err);
            }
            );

        } else {
            console.log('user already registered');
            res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in' });
        }
    });
});

module.exports = router;