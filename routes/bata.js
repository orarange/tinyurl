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
    console.log('mongodb connecting')
    await mongoose.connect(process.env.mongo_url);
    console.log('mongodb connected')
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
    
        if (req.cookies.refresh_token===undefined) {
        
            
            res.render('nindex', { url:'' ,tiny:'',premiu:'',name:'',demo:''});
        
        }else{
            const {token_type,access_token,refresh_token} = await refresh(req.cookies.refresh_token);
            const {username,id} = await userdat(token_type,access_token)

            res.cookie('refresh_token', refresh_token, {
                httpOnly: true
            });
            
            preuser.findOne({id:id}).then(d=>{
                if(!d){
                    res.render('nindex', { url: '' ,tiny:'',premiu:'',name:username,demo:''});
                }else{
                    if (!d.demo){
                        //res.render('promo')
                        res.render('nindex', { url: '' ,tiny:'',premiu:'yes',name:username,demo:''});
                    }else{
                        res.render('nindex', { url: '' ,tiny:'',premiu:'yes',name:username,demo:'disabled'});
                        //res.render('promo')
                    }
                }
            });
        
        }
    }
});

router.post('/tiny_url',async (req,res) => {
    const tinyuRl=Math.random().toString(32).substring(2)
    const {original,custom,domain} = req.body;
    const {token_type,access_token,refresh_token} = await refresh(req.cookies.refresh_token);
    const {id,username} = await userdat(token_type,access_token)
    
    console.log('tiny-url post')
    
    if (original.match(/^https?/)){
        console.log('url')
        preuser.findOne({id:id}).then(d=>{

            if(!d){
                console.log('free plan')
                //free planの処理
                const _tinyurl = new tinyurl({
                    original:original,
                    tiny:tinyuRl
                });
                
                _tinyurl.save();
                
                res.cookie('refresh_token', refresh_token, {
                    httpOnly: false
                });
                
                res.render('nindex',{url:'',tiny:`https://tiny-url.cf/t/${tinyuRl}`,premiu:'',name:username,demo:''})
            
            }else{
            console.log('premium plan')
                //premiumの処理
                if (custom){
                    console.log('custom')
                    premium.findOne({tiny:custom}).then(d=>{
                    
                        if(!d){
                            //重複customがなかった時の処理                            
                            const _premium = new premium({
                                original:original,
                                tiny:custom,
                                userid:id
                            });
                            
                            _premium.save();
                            
                            res.cookie('refresh_token', refresh_token, {
                                httpOnly: true
                            });
                            
                            res.render('nindex',{url:'',tiny:`https://${domain}/${custom}`,premiu:'yes',name:username,demo:''})                            
                        
                        }else{
                            //あったときの処理
                            res.cookie('refresh_token', refresh_token, {
                                httpOnly: true
                            });
                            
                            res.render('nindex',{url:custom,tiny:'Registered',premiu:'yes',name:username,demo:''})
                        
                        }
                    
                    });

                
                }else{
                    const _premium = new premium({
                        original:original,
                            tiny:tinyuRl,
                            userid:id
                    });
                            
                    _premium.save();
                            
                    res.cookie('refresh_token', refresh_token, {
                        httpOnly: true
                    });
                            
                    res.render('nindex',{url:'',tiny:`https://${domain}/${tinyuRl}`,premiu:'yes',name:username,demo:''})                            
   
                }
            
            }
            
        });
        
    }else{
        //URLじゃなかったときの処理
        res.render('nindex',{url:'',tiny:'',premiu:'',name:username,demo:''})
    
    }

})

module.exports = router;