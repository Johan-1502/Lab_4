new Vue({
    el: '#app',
    data: {
        serversList: [{id:1, status:true, isLeader:false, ip:'localhost', port:4000},
            {id:1, status:true, isLeader:false, ip:'localhost', port:4001},
            {id:1, status:false, isLeader:false, ip:'localhost', port:4002},
            {id:1, status:true, isLeader:true, ip:'localhost', port:4003},
            {id:1, status:true, isLeader:false, ip:'localhost', port:4004},
            {id:1, status:true, isLeader:false, ip:'localhost', port:4004}
        ],
        ipMonitorBack: '192.168.171.202',
        portMonitorBack: 7000,
        newServerModal: false
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
