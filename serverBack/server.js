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
let servers = [];
let ipLeader = '';
let portLeader = '';
let id = process.env.ID;

//Función para que se ejecuta al iniciar el servidor
function start(){
    obtainServers();
    leaderHealthCheck();
}

//Función para obtener los nodos actuales
async function obtainServers() {
    let response = await fetch(`http://${ipMonitor}:${portMonitor}/getServers`);
    let data = await response.json();
    servers = data.servers;
    setLeader();
}

//Función para setear el lider de la lista de servidores
function setLeader(){
    if (servers.length > 0) {
        for (let i = 0; i < servers.length; i++) {
            if (servers[i].isLeader) {
                ipLeader = servers[i].ip;
                portLeader = servers[i].port;
                isLeaderOnline = true;
            }            
        }
    }else{
        isLeader = true;
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
                logger('HTTP', 'healthCheck', 'El lider ya no está en linea')
                throwElection();
            }
        }
    }, timeInterval);
};

//Función para comenzar la elección
async function throwElection(){
    let aliveServers = 0;
    for (let i = 0; i < servers.length; i++) {
        if (servers[i].id > id && servers[i].ip != ipLeader && servers[i].port != portLeader) {
            try {
                let response = await fetch(`http://${ipLeader}:${portLeader}/throwElection`);
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
    }else{
        logger('JS', 'throwElection', 'Imposible declarase lider, hay nodos en linea con mayor id')
    }
}

//Función para anunaciarse como el nuevo lider
async function announceLeader() {
    for (let i = 0; i < servers.length; i++) {
        if (servers[i].id > id && servers[i].ip != ipLeader && servers[i].port != portLeader) {
            try {

                let response = await fetch(`http://${ipLeader}:${portLeader}/setLeader`, {
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
    }
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
    servers.push({id:data.id, ip: data.ip, port: data.port, isLeader: false})
    logger('HTTP', 'addServer     ', `El servidor de IP: ${data.ip} y puerto:${data.port} ha sido agregado`)
});

//Servicio para responder un healthcheck
app.get('/healthCheck', async (req, res) => {
    res.send({answer: 'OK', isServerLeader: isLeader});
});

//Servicio para responder a un nodo con id menor
app.get('/throwElection', async (req, res) => {
    isLeaderOnline = false;
    res.send({answer: 'OK'});
    throwElection();
});

//Servicio para setear el nuevo lider
app.put('/setLeader', async (req, res) => {
    const data = req.body;
    const serverFound = servers.find(server => server.ipServer === data.ip && server.portServer === data.port);
    ipLeader = data.ip;
    portLeader = data.port;
    serverFound.isLeader = true;
    isLeaderOnline = true;
});

page.listen(portServer, function () {
    logger('HTTP', 'Listen         ', `Servidor escuchando en http://${ipServer}:${portServer}`);
});