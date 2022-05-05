const exec = require('child_process').exec;

function pull(){
    exec('.\pull.sh', (err, stdout, stderr) => {
    if (err) { console.log(err); }
    console.log(stdout);
    });
}

pull()