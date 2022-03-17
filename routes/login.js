const express = require('express');
const router = express.Router();
const oauth = require('../functions/oauth');
const refresh = require('../functions/refresh');
const userdat = require('../functions/userdata');

router.get('/',async function(req,res){

    const { code } = req.query;


    if (code){
        
        const oauthdata= await oauth(code);
   
        res.cookie('refresh_token', oauthdata.refresh_token, {
            httpOnly: false
        });
        const userdata = await userdat(oauthdata.token_type,oauthdata.access_token);
        res.redirect('/');
        //res.render('login')
    }else{
    
        if (!req.cookies.refresh_token || req.cookies.refresh_token === 'undefined') {
        
            
            res.render('login');
        
        }else{

            const {token_type,access_token,refresh_token} = await refresh(req.cookies.refresh_token);
            const {username,id} = await userdat(token_type,access_token)

            res.cookie('refresh_token', refresh_token, {
                httpOnly: true
            });
            
            res.redirect('/');

            };
        
    }
})

module.exports = router;