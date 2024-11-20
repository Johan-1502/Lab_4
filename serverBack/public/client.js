new Vue({
    el: '#app',
    data: {
        ipServerBack: 'localhost',
        portServerBack: '5000',
        serverStatus: '',
        logs: [],
    },
    methods: {
        // Método para conectarse por websockets al back del cliente
        socket() {
            this.socket = io.connect(`http://${this.ipServerBack}:${this.portServerBack}`, { 'forceNew': true });
            this.socket.on('connect', () => {
            });

            this.socket.on('currentStatus', (data) => {
                this.serverStatus = data.status; 
            });

            this.socket.on('currentLogs', (data) => {
                this.logs.push(data); 
            });
        }
    },
    mounted() {
        this.socket();
    }
});
