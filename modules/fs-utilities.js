const fs = require('fs');
const ini = require('ini');
const configIni = ini.parse(fs.readFileSync(__basedir + "/config.ini", 'utf-8'));
//let firstLog = true;

function writeConfFile(data) {
    let date = new Date();
    data.data_aggiornamento = date.toISOString() 
    fs.writeFileSync(__basedir + "/data/backup-config.json", JSON.stringify(data));
}

function writeLogFile(data) {
    if (configIni.info.debug) {
        // if (firstLog) {
        //     fs.writeFile(__basedir + "/public/log/log.txt", '', function() {
        //         firstLog = false;
        //     });
        // }

        let date = new Date().toLocaleString(configIni.locale, {timeZone: configIni.timezone});
        fs.appendFileSync(__basedir + "/public/log/log.txt", date + ' ' + data + '\n');
    }
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

exports.writeConfFile = writeConfFile;
exports.writeLogFile = writeLogFile;
exports.isEmpty = isEmpty;