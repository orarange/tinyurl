const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {	
    await mongoose.connect(process.env.mongo_url);
}

router.get('/:id',function(req,res){
    tinyurl.findOne({tiny:req.params.id}).then(d=>{
        if(!d){
            premium.findOne({tiny:req.params.id}).then(d=>{
                if(!d){
                    res.status(404)
                    res.render('404')
                }else{
                    res.redirect(d.original)
                }
            });            
        }else{
            res.redirect(d.original)
        }
    });
})

module.exports = router;