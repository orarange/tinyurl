const fetch = require('node-fetch');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const preuser = require('../models/preuser');
const oauth = require('../functions/oauth');
const refresh = require('../functions/refresh');
const userdat = require('../functions/userdata');

main().catch(err => console.log(err));

async function main() {

    await mongoose.connect(process.env.mongo_url);
}



router.get('/', async (req, res) => {
    const { code } = req.query;


    if (code){
        
        const oauthdata= await oauth(code);
        res.cookie('refresh_token', oauthdata.refresh_token, {
            httpOnly: false
        });
        const userdata= await userdat(oauthdata.token_type, oauthdata.access_token);
        res.redirect('/');
        
    }else{
    
        if (!req.cookies.refresh_token||req.cookies.refresh_token==="undefined") {
        
            
            res.render('buypremium', { url:'' ,tiny:'',premiu:'',name:'',demo:'',log:'in'});
        
        }else{
            const {token_type,access_token,refresh_token} = await refresh(req.cookies.refresh_token);
            const {username,id} = await userdat(token_type,access_token)

            res.cookie('refresh_token', refresh_token, {
                httpOnly: true
            });
            
            preuser.findOne({id:id}).then(d=>{
                if(!d){
                    res.render('buypremium', { url: '' ,tiny:'',premiu:'',name:username,demo:'',log:"out"});
                }else{
                    if (!d.demo){
                        //res.render('promo')
                        res.render('buypremium', { url: '' ,tiny:'',premiu:'yes',name:username,demo:'',log:'out'});
                    }else{
                        res.render('buypremium', { url: '' ,tiny:'',premiu:'yes',name:username,demo:'disabled',log:'out'});
                        //res.render('promo')
                    }
                }
            });
        
        }
        
    }
});


module.exports = router;