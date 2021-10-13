const ini = require('ini');
const fs = require('fs');
const exec = require('child_process').exec;
const configIni = ini.parse(fs.readFileSync(__basedir + "/config.ini", 'utf-8'));
const fsUtilites = require('./fs-utilities.js');
const emit = require(__basedir + "/periferica.js");

async function executeCmd(cmd, args) {
    switch (cmd) {
        case "riavvia-macchina":
            let pathReboot = __basedir + "\\bin\\reboot.cmd";
            let cmdReboot = `"${pathReboot}`;

            try {
                let result = await execPromise(cmdReboot);
                console.log(result);
                emit.sendPeriferica();
                return true;
            } catch(e) {
                console.log(e);
                emit.sendPeriferica(cmd);
                return false;
            }
        case "spegni-macchina":
            let pathShutDown = __basedir + "\\bin\\shutdown.cmd";
            let cmdShut = `"${pathShutDown}`;

            try {
                let result = await execPromise(cmdShut);
                console.log(result);
                emit.sendPeriferica();
                return true;
            } catch(e) {
                console.log(e);
                emit.sendPeriferica(cmd);
                return false;
            }
        case "sync-macchina":
            const pagePath = configIni.git.path;
            let pathSync = __basedir + "\\bin\\git-pull.cmd";
            let cmdSync = `"${pathSync}" "${pagePath}"`

            try {
                let result = await execPromise(cmdSync);
                console.log(result);
                emit.sendPeriferica();
                return true;
            } catch(e) {
                console.log(e);
                emit.sendPeriferica(cmd);
                return false;
            }
        default:
            console.log("COMANDO NON RICONOSCIUTO", cmd);
    }
}

function execPromise(command) {
    return new Promise(function (resolve, reject) {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                fsUtilites.writeLogFile(stdout + err + stderr);
                reject(err);
                return;
            }
            fsUtilites.writeLogFile(stdout);
            resolve(stdout.trim());
        });
    })
}

exports.executeCmd = executeCmd;