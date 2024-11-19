new Vue({
    el: '#app',
    data: {
        serversList: [{id:1, status:true, isLeader:true, ip:'localhost', port:4000},
            {id:1, status:true, isLeader:true, ip:'localhost', port:4111},
            {id:1, status:false, isLeader:true, ip:'localhost', port:40300},
            {id:1, status:true, isLeader:true, ip:'localhost', port:40050},
            {id:1, status:true, isLeader:true, ip:'localhost', port:40600}
        ],
        ipMonitorBack: 'localhost',
        portMonitorBack: 7000
    },
    methods: {
        // Método para conectarse por websockets al back del cliente
        socket() {
            this.socket = io.connect(`http://${this.ipMonitorBack}:${this.portMonitorBack}`, { 'forceNew': true });
            this.socket.on('connect', () => {
                console.log('Conectado al servidor de WebSocket');
            });
            
            this.socket.on('serversList', (data) => {
                this.serversList = data; 
            });

        }
    },
    mounted() {
        this.socket();
    }
});
