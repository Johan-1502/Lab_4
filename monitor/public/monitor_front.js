new Vue({
    el: '#app',
    data: {
        serversList: [{ id: 1, status: true, isLeader: false, ip: 'localhost', port: 4000 },
        { id: 1, status: true, isLeader: true, ip: 'localhost', port: 4111 },
        { id: 1, status: false, isLeader: false, ip: 'awaas', port: 40300 },
        { id: 1, status: true, isLeader: false, ip: 'localhost', port: 40050 },
        { id: 1, status: true, isLeader: false, ip: 'localhost', port: 40600 }],
        ipMonitorBack: '192.168.171.202',
        portMonitorBack: 7000,
        newServerModal: false,
        serverStatus: null,
        idNewServer: null
    },
    methods: {
        // Método para conectarse por websockets al back del cliente
        socket() {
            this.socket = io.connect(`http://${this.ipMonitorBack}:${this.portMonitorBack}`, { 'forceNew': true });
            this.socket.on('connect', () => {
                console.log('Conectado al servidor de WebSocket');
            });

            this.socket.on('serverStatus', (data) => {
                const serverFound = this.serversList.find(server => server.ip === data.ip && server.port === data.port);
                serverFound.status = data.status;
            });

            this.socket.on('serversList', (data) => {
                this.serversList = data;
            });
        },
        async deploy(){
            const response = await fetch(`http://${this.ipMonitorBack}:${this.portMonitorBack}/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: this.idNewServer})
            });
            
            const data = await response.json();
            
            if (data.answer === 'OK') {
                console.log('servidor desplegado');
            } else {
                console.log('no fue posible desplegar el servidor');
            }
            this.newServerModal = false;
        },
        //En lo que dice ip y port toca poner la información del botón oprimido para saber que ip y puerto es el que se va a enviar
        async changeServerStatus(server){
            const ip = server.ip;
            const port = server.port;
            const response = await fetch(`http://${this.ipMonitorBack}:${this.portMonitorBack}/changeServerStatus`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: ip, port: port})
            });
            
            if(response.ok){
                const data = await response.json();
            
                if (data.answer === 'OK') {
                    // server.status = false;
                    console.log('se ha cambiado el estado del servidor');
                } else {
                    console.log('no fue posible cambiado el estado del servidor');
                }
                server.status = data.result;
            }
            
        },
        openModal(){
            this.newServerModal = true;
        },
        closeModal(){
            this.newServerModal = false;
        },
        
    },
    mounted() {
        this.socket();
    }
});
