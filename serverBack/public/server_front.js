new Vue({
    el: '#app',
    data: {
        ipServerBack:"192.168.171.202",
        portServerBack:"5005",
        serverStatus: '',
        serverLogs: [],
        serverHealthCheck: [],
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
                this.serverLogs = data; 
            });

            this.socket.on('healthCheckLogs', (data) => {
                this.serverHealthCheck.push(data); 
            });
        }
    },
    mounted() {
        this.socket();
    }
});