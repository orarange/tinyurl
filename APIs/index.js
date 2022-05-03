const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const preuser = require('../models/preuser');
const oauth = require('../functions/oauth');
const refresh = require('../functions/refresh');
const userdat = require('../functions/userdata');
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {	
    await mongoose.connect(process.env.mongo_url);
}

router.get('/',function(req,res){
    res.json({hello:'world'})
})

router.post('/make',async (req,res) => {
    const tinyuRl=Math.random().toString(32).substring(2)
    const {original,custom,domain,id} = req.body;
    console.log(req.body)
    if (original){
        if (original.match(/^https?/)){
            preuser.findOne({id:id}).then(d=>{
    
                if(!d){
                    console.log('free plan')
                    //free planの処理
                    const _tinyurl = new tinyurl({
                        original:original,
                        tiny:tinyuRl
                    });
                    
                    _tinyurl.save();
                    
                    res.json({status:'200',message:'request was successful!',tiny:`https://tinyurl-1.orraorange.repl.co/t/${tinyuRl}`})
                
                }else{
                console.log('premium plan')
                    if (!domain){
                        console.log(domain)
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
                                    
                                    res.json({status:'200',message:'request was successful!',tiny:`https://tinyurl-1.orraorange.repl.co/t/${custom}`})                            
                                
                                }else{
                                    //あったときの処理
                                    res.status(400)
                                    res.json({status:'400',message:'Bad Request',tiny:'Registered'})
                                
                                }
                            
                            });
        
                        
                        }else{
                            const _premium = new premium({
                                original:original,
                                    tiny:tinyuRl,
                                    userid:id
                            });
                                    
                            _premium.save();
                                    
                                    
                            res.json({status:'200',message:'request was successful!',tiny:`https://tinyurl-1.orraorange.repl.co/t/${tinyuRl}`})                            
           
                        }
                    
                    }else{
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
                                    
                                    res.json({status:'200',message:'request was successful!',tiny:`https://${domain}/${custom}`})                            
                                
                                }else{
                                    //あったときの処理
                                    res.status(400)
                                    res.json({status:'400',message:'Bad Request',tiny:'Registered'})
                                
                                }
                            
                            });
        
                        
                        }else{
                            const _premium = new premium({
                                original:original,
                                    tiny:tinyuRl,
                                    userid:id
                            });
                                    
                            _premium.save();
                                    
                                    
                            res.json({status:'200',message:'request was successful!',tiny:`https://${domain}/${tinyuRl}`})                            
           
                        }
                    
                    }
                }
                
            });
            
        }else{
            //URLじゃなかったときの処理
            console.log('not URL')
            res.status(400)
            res.json({status:'400',message:'Bad Request'})
        
        }
    }else{
        console.log('no URL')
        res.status(400)
        res.json({status:'400',message:'Bad Request'})
    }
})

module.exports = router;