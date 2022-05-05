const exec = require('child_process').exec;

function pull(){
    exec('ls -la ./', (err, stdout, stderr) => {
    if (err) { console.log(err); }
    console.log(stdout);
    });
}