const express = require('express');
const router = express.Router();


router.get('/', (req, res) => {
    res.render('home',{'log':'in','premiu':false,'name':undefined,'domain':undefined,'demo':'false','url':undefined,'tiny':undefined});
}
);


module.exports = router;