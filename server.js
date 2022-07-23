const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const logger = require('morgan');


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', require('./routes/index'));


app.listen(3030, () => {
    console.log('Server is running on port 3030');
}
);