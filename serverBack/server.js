const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: ".env" });
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'))

var page = require('http').Server(app);
var io = require('socket.io')(page);

let ipServer = process.env.IP;
let portServer = process.env.PORT;
let ipMonitor = process.env.IP_MONITOR;
let portMonitor = process.env.PORT_MONITOR;
let timeInterval = parseInt(process.env.INTERVAL, 10);
let isLeader = false;
let isLeaderOnline = false;
let idServer = process.env.ID;
let ipLeader = '';
let portLeader = '';
let electionLaunched = false;
let servers = [];


//Función para que se ejecuta al iniciar el servidor
async function start() {
    await obtainServers();
    await leaderHealthCheck();
}

//Función para obtener los nodos actuales
async function obtainServers() {
    try {
        console.log(`IP_MONITOR: ${process.env.IP_MONITOR}, PORT_MONITOR: ${process.env.PORT_MONITOR}`);

        let response = await fetch(`http://${ipMonitor}:${portMonitor}/addServer`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ip: ipServer, port: portServer, id:idServer})
        })
        let data = await response.json();
        servers = data.currentServers;
        console.log("Servidores enviados por el monitor", servers);
        servers = servers.filter(server => !(server.ip === ipServer && server.port === portServer));
        console.log("Servidores filtrados", servers);

        logger('HTTP', 'getServers', 'Se han obtenido los servidores actuales')
        await setLeader();
    } catch (error) {
        console.log(error)
        logger('HTTP', 'getServers', 'no se ha podido obtener los servidores porque el monitor no está disponible')
    }
}

//Función para setear el lider de la lista de servidores
async function setLeader() {
    if (servers.length > 0) {
        for (let i = 0; i < servers.length; i++) {
            console.log(servers[i].isLeader)
            if (servers[i].isLeader) {
                ipLeader = servers[i].ip;
                portLeader = servers[i].port;
                isLeaderOnline = true;
                logger('JS', 'setLeader', `El nodo de ip ${ipLeader} y puerto ${portLeader} se ha seteado como el actual líder`);
            }
        }
    } else {
        isLeader = true;
        logger('JS', 'setLeader', `No hay más nodos por lo que se es declarado lider`);
        let response = await fetch(`http://${ipMonitor}:${portMonitor}/updateLeader`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ip: ipServer, port: portServer })
        })
    }
}

//Función para realizar healthCheck al lider
async function leaderHealthCheck() {
    setInterval(async () => {
        if (!isLeader && isLeaderOnline) {
            try {
                let response = await fetch(`http://${ipLeader}:${portLeader}/healthCheck`);
                let data = await response.json();

                if (data.answer === 'OK') {
                    logger('HTTP', 'healthCheck', 'Lider en linea')
                }
            } catch (error) {
                isLeaderOnline = false
                console.log(error);
                logger('HTTP', 'healthCheck', 'El lider ya no está en linea')
                throwElection();
            }
        }
    }, timeInterval * 1000);
};

//Función para comenzar la elección
async function throwElection() {
    electionLaunched = true;
    let aliveServers = 0;
    for (let i = 0; i < servers.length; i++) {
        //Volví a añadir la condición ya que en los requisitos se pide que no le lance la elección al lider recién caido
        if (servers[i].id > idServer && servers[i].ip != ipLeader && servers[i].port != portLeader) {
            logger('HTTP', 'throwElection', `El nodo con ip ${servers[i].ip} y puerto ${servers[i].port} es opción de lider`)
            try {
                let response = await fetch(`http://${servers[i].ip}:${servers[i].port}/throwElection`);
                let data = await response.json();

                if (data.answer === 'OK') {
                    logger('HTTP', 'throwElection', `La opción de lider con ip ${servers[i].ip} y puerto ${servers[i].port} está en linea`)
                    aliveServers++;
                }
            } catch (error) {
                logger('HTTP', 'throwElection', `La opción de lider con ip ${servers[i].ip} y puerto ${servers[i].port} NO está en linea`)
            }
        }
    }
    if (aliveServers == 0) {
        logger('JS', 'throwElection', 'No hay nodos con mayor id, procediendo a declarase lider')
        announceLeader();
    } else {
        logger('JS', '', 'Imposible declarase lider, hay nodos en linea con mayor id')
    }throwElection
}

//Función para anunaciarse como el nuevo lider
async function announceLeader() {
    for (let i = 0; i < servers.length; i++) {
        try {
            let response = await fetch(`http://${servers[i].ip}:${servers[i].port}/setLeader`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ip: ipServer, port: portServer })
            })
            let data = await response.json();
            logger('HTTP', 'setLeader', `Se le ha anunciado al servidor de ip ${servers[i].ip} y puerto ${servers[i].port} el nuevo lider`)
        } catch (error) {
            logger('HTTP', 'setLeader', `No se le ha podido anunciar al servidor con ip ${servers[i].ip} y puerto ${servers[i].port} el nuevo lider porque NO está en linea`)
        }
    }
    isLeader = true;
    let response = await fetch(`http://${ipMonitor}:${portMonitor}/updateLeader`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip: ipServer, port: portServer })
    })
    electionLaunched = false;
}

//Función para mostar logs en formato protocolo | endpoint | mensaje
function logger(protocol, endpoint, message) {
    let log = `${new Date(Date.now()).toLocaleTimeString()} | ${protocol} | ${endpoint} | ${message}`;
    console.log(log);
    //socket.emit('logs', { port: portClient, ip: ipClient, content: log })
    //io.emit('currentLogs', log);
};

//Servicio para añadir un nuevo servidor
app.post('/addServer', async (req, res) => {
    const data = req.body;
    servers.push({ id: data.id, ip: data.ip, port: data.port, isLeader: false })
    logger('HTTP', 'addServer     ', `El servidor de IP: ${data.ip} y puerto:${data.port} ha sido agregado`)
    res.send({ message: 'Recibido' });
});

//Servicio para responder un healthcheck
app.get('/healthCheck', async (req, res) => {
    res.send({ answer: 'OK', isServerLeader: isLeader });
});

//Servicio para responder a un nodo con id menor
app.get('/throwElection', async (req, res) => {
    isLeaderOnline = false;
    res.send({ answer: 'OK' });
    if (!electionLaunched) {
        throwElection();
    }
});

//Servicio para setear el nuevo lider
app.put('/setLeader', async (req, res) => {
    const data = req.body;
    logger("HTTP", "setLeader", `Los datos del nuevo lider son: ${data}`)
    ipLeader = data.ip;
    portLeader = data.port;
    isLeaderOnline = true;
    electionLaunched = false;
    res.send({answer: 'OKBB'})
});

start();

page.listen(portServer, function () {
    logger('HTTP', 'Listen         ', `Servidor escuchando en http://${ipServer}:${portServer}`);
});