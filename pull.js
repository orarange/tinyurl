const exec = require('child_process').exec;

function pull(){
    exec('git pull origin master', (err, stdout, stderr) => {
    if (err) { console.log(err); }
    console.log(stdout);
    });
}

pull()