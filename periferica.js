// CONFIG BASE DIRECTORY
global.__basedir = __dirname;

// MARK - DECLARATIONS
const os = require('os');
const ioclient = require('socket.io-client');
const commands = require('./modules/commands.js');
const fs = require('fs');
const ini = require('ini');
const configIni = ini.parse(fs.readFileSync(__basedir + "/config.ini", 'utf-8'));
const fsUtilites = require('./modules/fs-utilities.js');
const path = require('path');
var ping = require('ping');
var cors = require('cors');

const passwordProtected = require('express-password-protect');

const config = {
    username: "bergamo",
    password: "900",
    maxAge: 120000
}

// EXPRESS

const express = require('express');
const app = express();
app.use(passwordProtected(config))
app.use(cors());

app.options('*', cors());
let mustacheExpress = require('mustache-express');

const bodyParser = require('body-parser');
app.set('view engine', 'mustache');
app.engine('mustache', mustacheExpress());
app.use(express.static(configIni.app.adminPath + '/public'));

const interface = require('./routes/interface')
app.use('/', interface);

app.use(bodyParser.json());

// FINE EXPRESS

let centrale = ioclient(configIni.connection.centrale);
let mappa = ioclient(configIni.configuration.mappa);

let port = configIni.connection.io;
let clientSocket = null;

//INFO MACHINE
const machineName = os.hostname();
const name = configIni.info.name;
const baseAppUrl = configIni.app.baseUrl;

// VARIABILI DI RUNTIME
let isAppOffline = true;
let socketError = false;

//INFO TO SEND TO CENTRALE
let infoDebug = {
    "error-chromiumcrashed": null,
    "error-pageerror": null,
    "error-requestfailed": null,
    "console": []
}

var server = app.listen(port, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
});

const io = require('socket.io')(server, {
    origins: '*:*'
});

//  MARK - WEBSOCKET METHODS
mappa.on('connect', function () {
    fsUtilites.writeLogFile("connected to central");
    console.log(`connected to central`);

    mappa.emit('periferica', {'color': configIni.configuration.name, 'nome': configIni.configuration.name});
    emitPeriferica();
});

centrale.on("connect_error", async function () {
    if (!socketError) {
        fsUtilites.writeLogFile("CENTRALE è OFFLINE");
        console.log("CENTRALE è OFFLINE");
        socketError = true;
    }
});


centrale.on('reset', function () {
    if (client) {
        fsUtilites.writeLogFile("reset");
        client.emit('reset');
    } else {
        console.log('CLIENT NOT FOUND');
    }
});

centrale.on('disconnect', function () {
    console.log(`disconnected from central`);
    fsUtilites.writeLogFile('disconnected from central');
});

centrale.on('cmd', async function (data) {
    console.log(data, `ho ricevuto il cmd from central`);
    fsUtilites.writeLogFile('ho ricevuto il cmd from central ' + data);


    await commands.executeCmd(data);

    refresh();
}.bind(this));

centrale.on('config', async function (data) {
    console.log(data, `from central`);
    socketError = false;

    // scrivo il file di backup
    if(data != null && data != "") {
        fsUtilites.writeConfFile(data);
        fsUtilites.writeLogFile('ricevuta la configurazione');
    } else {
        console.log("received null data");
        fsUtilites.writeLogFile("received null data");
    }
});

io.on('connection', function (socket) {
    socket.on('chrome', async function () {
        clientSocket = socket;

        let res = await ping.promise.probe(configIni.connection.centraleIp, {
            timeout: configIni.connection.pingCentraleTimeoutSeconds,
            extra: ['-i', '2'],
        });
        
        if(res.alive) {
            fsUtilites.writeLogFile("centrale is online, opening: ", baseAppUrl + getAppPage());
            sendChangePage(getAppPage());
            isAppOffline = false;
            emitPeriferica();
        } else {
            fsUtilites.writeLogFile("pinged, centrale is offline, opening: ", baseAppUrl + getAppPage());
            sendChangePage(getAppPage());
            isAppOffline = false;
            emitPeriferica();
        }
    }.bind(this));

    socket.on('inside', function () {
        fsUtilites.writeLogFile('sono inside');

    }.bind(this));

    socket.on('client', function() {
        fsUtilites.writeLogFile('sono inside');
        isAppOffline = false;
        client = socket;
        client.emit('configuration', {'color': configIni.configuration.name, 'nome': configIni.configuration.name});
        emitPeriferica();
    });

    socket.on('logoPage', function() {
        mappa.emit('logo', {'color': configIni.configuration.color, 'nome': configIni.configuration.name});
        console.log("LogoPage");
    });

    socket.on('showME', function() {
        mappa.emit('showME', {'color': configIni.configuration.color, 'nome': configIni.configuration.name});
        console.log("showME");
    });

    socket.on('approfondimento', function() {
        mappa.emit('approfondimento', {'color': configIni.configuration.color, 'nome': configIni.configuration.name});
        console.log("Appro");
    });

    socket.on('mouseClick', function() {
        mappa.emit('mouseClick', {'color': configIni.configuration.color, 'nome': configIni.configuration.name});
        console.log("click");
    });

    socket.on('disconnect', function () {

        // TODO: Oltre a fare solo l'update di quando mi sconnetto devo reinviare le mie info con le segnalazioni
        console.log(`${socket.id} disconnected`);

        if (socket == clientSocket) {
            fsUtilites.writeLogFile('disconnessa applicazione ' + baseAppUrl + getAppPage());
            clientSocket = undefined;
            isAppOffline = true;
            emitPeriferica();
        }
    }.bind(this));
});

function sendChangePage(url) {
    // FORM FULL URL
    var pattern = /^((http|https):\/\/)/;

    let urlComplete = "";

    if (pattern.test(url)) {
        urlComplete = url; 
    } else {
        urlComplete = baseAppUrl + url;
    }

    if (clientSocket) {
        configIni.app.prepend ? clientSocket.emit('loadPage', urlComplete + configIni.app.prepend) : clientSocket.emit('loadPage', url); 
    }
}


function refresh() {
    if (clientSocket) {
        clientSocket.emit('refresh');
    }
}

async function emitPeriferica(errorOp) {  
    if (errorOp) {
        infoDebug["errorOperation"] = {'success': false, error: errorOp};
    } else {
        infoDebug["errorOperation"] = {'success': true, error: null}
    }

    if (isAppOffline || isAppOffline == null) {
        infoDebug["error-pageerror"] = true;
    } else { 
        infoDebug["error-pageerror"] = null;
    }

    centrale.emit('periferica', {
        machineName: machineName,
        name: name,
        infoDebug: infoDebug,
    });
}

// Questa funzione apre la pagina sul file di backup. Se il file di backup non è presente avviene il resirect sull'app specificate nel file.ini
function getAppPage() {
    let backupConfig = null;

    try { 
        backupConfig = JSON.parse(fs.readFileSync(__basedir + '/data/backup-config.json', 'utf-8')); } 
    catch (err) {
        console.log(err);
        fsUtilites.writeLogFile(err);
    }

    let appUrl = '';

    if (backupConfig) {
        if (backupConfig.app && configIni.info.useCentrale) {
            console.log("Ho letto il file di config", backupConfig);
            appUrl = backupConfig.app;
            fsUtilites.writeLogFile(`Ho letto il file di config ${backupConfig.app}`);
        } else {
            console.log("Sto usando l'app di backup dall'ini");
            appUrl = configIni.app.backupAppUrl;
            fsUtilites.writeLogFile("Sto usando l'app di backup dall'ini, backupConfig.app non valorizzato");
        }
    } else {
        fsUtilites.writeLogFile("Sto usando l'app di backup dall'ini, backup config parsing failed");
        console.log("Sto usando l'app di backup dall'ini, backup config parsing failed");
        appUrl = configIni.app.backupAppUrl;
    }

    return appUrl;
}

function sendPeriferica(error) {
    console.log('sono qui con questo errore', error);
    emitPeriferica(error)
}

exports.sendPeriferica = sendPeriferica;