new Vue({
    el: '#app',
    data: {
        logicalTime: '',
        ipClientBack:'',
        portClientBack:''
    },
    methods: {
        // Método para conectarse por websockets al back del cliente
        socket() {
            this.socket = io.connect(`http://${this.ipClientBack}:${this.portClientBack}`, { 'forceNew': true });
            this.socket.on('connect', () => {
            });

            this.socket.on('currentHour', (data) => {
                this.logicalTime = data.hour; 
            });
        },
        formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString();
        }
    },
    mounted() {
        this.socket();
    }
});
