new Vue({
    el: '#app',
    data: {
        ipServerBack:"localhost",
        portServerBack:"5005",
        serverStatus: '',
        serverLogs: [{asdf:2345}],
        isLeader: false
    },
    methods: {
        // Método para conectarse por websockets al back del cliente
        socket() {
            this.socket = io.connect(`http://${this.ipServerBack}:${this.portServerBack}`, { 'forceNew': true });
            this.socket.on('connect', () => {
                console.log('Conectado al servidor de WebSocket');
            });

            this.socket.on('currentStatus', (data) => {
                this.serverStatus = data.status; 
            });

            this.socket.on('currentLogs', (data) => {
                this.serverLogs.push(data); 
            });
        }
    },
    mounted() {
        this.socket();
    }
});