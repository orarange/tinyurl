const express = require('express');
const app = express();
const bodyParser = require('body-parser');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(express.static('public'));


app.use('/', require('./routes/index'));


app.listen(3000, () => {
    console.log('Server is running on port 3000');
    }
);