new Vue({
    el: '#app',
    data: {
        ipServerBack:"192.168.1.2",
        portServerBack:"5005",
        serverStatus: '',
        serverLogs: [],
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
