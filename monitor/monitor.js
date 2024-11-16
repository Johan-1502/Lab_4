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

let ipMonitor = process.env.IP_MONITOR;
let portMonitor = process.env.PORT_MONITOR;

let servers = []
let countServers = 0;

app.get('/deployServer', async (req, res) => {

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
                    logger("HTTP", "addServer",`El nodo ${servers[i].ip}:${servers[i].port} está caido.`)
                }
                console.log('en el for');
            }
        }
        console.log('salio del for');

        logger('HTTP', 'addServer', `Se ha agregado el nodo de ip ${data.ip} y puerto ${data.port}`)
        servers.push({ id: data.id, ip: data.ip, port: data.port, isLeader: false })
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