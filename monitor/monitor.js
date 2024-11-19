const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: ".env" });
const { Client } = require('ssh2');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'))

var page = require('http').Server(app);
var io = require('socket.io')(page);

const ipComputer1 = process.env.IP_COMPUTER1;
const ipComputer2 = process.env.IP_COMPUTER2;

let ipMonitor = process.env.IP_MONITOR;
let portMonitor = process.env.PORT_MONITOR;

let servers = [];
let identifiers = [];
let countServers = 0;

let actualPort = 5000;
let infoComputerSelected;
let ipToAdd;
let portToAdd;

io.on('connection', (socket) => {
    logger(' WS ', 'connection    ', 'El front del coordinador se ha conectado con Sockets');
    // socket.on('logs', (data) => {
    //     logger(' WS ', 'logs          ', `El cliente ${data.ip}:${data.port} envió --> ${data.content}`);
    // });
    io.emit('serversList', servers);
});

//Hacer que cuando se agregue se le envíe a todos los nodos el nuevo nodo
//Hay que cambiar para que el id se ponga de lo que envíe el front
app.put('/addServer', async (req, res) => {
    let data = req.body;
    res.send({ currentServers: servers });
    console.log(servers);
    const serverFound = servers.find(server => server.ip === data.ip && server.port === data.port);
    console.log('entrando al for');
    if (!serverFound) {
        if (servers.length > 0) {
            for (let i = 0; i < servers.length; i++) {
                try {
                    let response = await fetch(`http://${servers[i].ip}:${servers[i].port}/addServer`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ip: data.ip, port: data.port, id: data.id })
                    })
                } catch (error) {
                    logger("HTTP", "addServer", `El nodo ${servers[i].ip}:${servers[i].port} está caido.`)
                }
                console.log('en el for');
            }
        }
        console.log('salio del for');
        
        logger('HTTP', 'addServer', `Se ha agregado el nodo de ip ${data.ip} y puerto ${data.port}`)
        servers.push({ id: data.id, ip: data.ip, port: data.port, isLeader: false })
        io.emit('serversList', servers);
    } else {
        logger('HTTP', 'addServer', `El nodo de ip ${data.ip} y puerto ${data.port} está en linea de nuevo`)
    }
});

app.post('/updateLeader', async (req, res) => {
    let data = req.body;
    console.log(data);
    const serverFound = servers.find(server => server.ip === data.ip && server.port === data.port);
    for (let i = 0; i < servers.length; i++) {
        if (servers[i].isLeader) {
            servers[i].isLeader = false;
        }
    }
    serverFound.isLeader = true;
    logger('HTTP', 'updateLeader', `El nodo de ip ${data.ip} y puerto ${data.port} Se ha actualizado como lider`)
    console.log(servers);
});


// Método para comenzar a desplegar un nuevo cliente
app.post('/deploy', async (req, res) => {
    let data = req.body;
    logger('HTTP', 'deploy        ', 'Creando nueva instancia')

    chooseComputer(data.id);
    actualPort++;

    res.status(200).send({ answer: 'OK' });
});

// Método para elegir un computador y conectarse a él
function chooseComputer(id) {
    selectComputer(id);
    connect();
}

// Método para seleccionar el computador en el que se lanzará la instancia
function selectComputer(id) {
    let number = Math.floor(Math.random() * 2) + 1;
    let command;
    let ipComputerSelected;
    let passwordSelected;
    let serverName;
    console.log(number)
    if (number == 1) {
        ipComputerSelected = ipComputer1;
        //passwordSelected = '211100'
        //serverName = 'server'
        passwordSelected = 'sebas1502'
        serverName = 'administrador'
    } else {
        ipComputerSelected = ipComputer2;
        passwordSelected = 'sebas1502'
        serverName = 'administrador'
    }
    //docker run -e IP=192.168.1.109 -e PORT=5001 -e IP_MONITOR=192.168.1.109 -e PORT_MONITOR=7000 -e INTERVAL=6 -e ID=1  --name nodo2 -p 5001:5001 -d nodo
    command = `echo "${passwordSelected}" | sudo -S docker run -e IP=${ipComputerSelected} -e PORT=${actualPort} -e IP_MONITOR=${ipMonitor} -e PORT_MONITOR=${portMonitor} -e INTERVAL=${newTimeInterval()} --name server${actualPort - 5000} -p ${actualPort}:${actualPort} -d nodo`;
    ipToAdd = ipComputerSelected;
    portToAdd = actualPort;
    infoComputerSelected = { command: command, ipComputerSelected: ipComputerSelected, passwordSelected: passwordSelected, name: serverName };
    logger(' SH ', 'selectComputer', `El computador selecionado es ${infoComputerSelected.ipComputerSelected}`)
}

// método para obtener el intervalo en que hará healthcheck
function newTimeInterval() {
    const numbers = [3, 6, 4, 5];
    const randomIndex = Math.floor(Math.random() * numbers.length);
    logger(' JS ', 'newTimeInterval', `El intervalo de tiempo elegido es de: ${numbers[randomIndex]} ms`);
    return numbers[randomIndex];
}

//Método para connectarse por SSH y lanzar la instancia
function connect() {
    const conn = new Client();
    conn.on('ready', () => {
        console.log('Conexión SSH establecida');
        conn.exec(infoComputerSelected.command, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log('Comando finalizado con código:', code);
                conn.end();
            }).on('data', (data) => {
                console.log('Salida del comando:\n' + data);
                console.log(''+data);
                
                identifiers.push({ ipServer: ipToAdd, portServer: portToAdd, identifier: ''+data , fallen: false})
            }).stderr.on('data', (data) => {
                console.error('Error del comando:\n' + data);
            });
        });
    }).connect({
        host: infoComputerSelected.ipComputerSelected,
        port: 22,
        username: infoComputerSelected.name,
        password: infoComputerSelected.passwordSelected
    });
}

//Servicio para cambiar el estado de un servidor
app.put('/changeServerStatus', async (req, res) => {
    let data = req.body;
    changeServerStatus(data.ip, data.port);
    res.status(200).send({ answer: 'OK' });
});

//Método para cambiar el estado de un servidor
async function changeServerStatus(ip, port) {
    console.log(identifiers[0].identifier);
    console.log(ip,':',port);
    console.log(identifiers);
    
    const serverToFall = identifiers.find(server => (server.ipServer == ''+ip && server.portServer == ''+port));
    console.log(serverToFall);
    
    let serverIdentifier = serverToFall.identifier;
    let isFallen = serverToFall.fallen
    if (serverToFall.fallen) {
        command = `echo "${infoComputerSelected.passwordSelected}" | sudo -S docker start ${serverIdentifier}`;
        serverToFall.fallen = false;
    }else{
        command = `echo "${infoComputerSelected.passwordSelected}" | sudo -S docker stop ${serverIdentifier}`;
        serverToFall.fallen = true;
    }
    const conn = new Client();
    conn.on('ready', () => {
        console.log('Conexión SSH establecida');
        conn.exec(command, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log('Comando finalizado con código:', code);
                conn.end();
            }).on('data', (data) => {
                console.log('Salida del comando:\n' + data);
                if (isFallen) {
                    logger('SSH','stopServer',`Se ha activado el servidor ${serverToFall.ipServer}:${serverToFall.portServer}`)
                }else{
                    logger('SSH','stopServer',`Se ha caido el servidor ${serverToFall.ipServer}:${serverToFall.portServer}`)
                }
            }).stderr.on('data', (data) => {
                console.error('Error del comando:\n' + data);
            });
        });
    }).connect({
        host: ip,
        port: 22,
        username: infoComputerSelected.name,
        password: infoComputerSelected.passwordSelected
    });

}

//Función para mostar logs en formato protocolo | endpoint | mensaje
function logger(protocol, endpoint, message) {
    let log = `${new Date(Date.now()).toLocaleTimeString()} | ${protocol} | ${endpoint} | ${message}`;
    console.log(log);
    //socket.emit('logs', { port: portClient, ip: ipClient, content: log })
    //io.emit('currentLogs', log);
};

page.listen(portMonitor, function () {
    logger('HTTP', 'Listen', `Servidor escuchando en http://${ipMonitor}:${portMonitor}`);
});