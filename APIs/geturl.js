const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');


async function main() {
    await mongoose.connect(process.env.mongo_url);
}


router.get('/',function(req,res){
    const { t , o } = req.query;

    if (t){
        tinyurl.findOne({tiny:t}).then(d=>{
            if (d){
                res.json({status:'200',message:'ok',original:d.original})
            }else{
                res.json({status:'404',message:'not found'})
            }
        }
        )
    }else{
        tinyurl.findOne({original:o}).then(d=>{
            if (d){
                res.json({status:'200',message:'ok',tiny:d.tiny})
            }else{
                res.json({status:'404',message:'not found'})
            }
        }
        )
    }


})


module.exports = router;