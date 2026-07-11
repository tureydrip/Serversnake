const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const admin = require('firebase-admin');

// 1. Inicializar Firebase Admin (Necesitas tu archivo de clave de servicio JSON de Firebase)
// const serviceAccount = require('./firebase-key.json');
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let waitingPlayers = [];
let activeRooms = {};
let roomIdCounter = 0;

wss.on('connection', (ws) => {
    console.log('NUEVO JUGADOR CONECTADO');

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // A. SISTEMA DE EMPAREJAMIENTO
        if (data.type === 'BUSCAR_PARTIDA') {
            waitingPlayers.push({ ws: ws, id: data.playerId });
            console.log(`Jugador ${data.playerId} en cola. Total: ${waitingPlayers.length}`);

            // Enviar notificación Push a todos mediante Firebase
            // enviarNotificacionPush("¡Batalla Lista!", `El jugador ${data.playerId} está buscando partida. ¡Entra ya!`);

            if (waitingPlayers.length >= 2) {
                // Crear Sala
                roomIdCounter++;
                const roomName = `ROOM_${roomIdCounter}`;
                const p1 = waitingPlayers.shift();
                const p2 = waitingPlayers.shift();

                activeRooms[roomName] = [p1, p2];
                p1.room = roomName; p2.room = roomName;

                // Avisar a los celulares que la partida empieza
                const startMsg = JSON.stringify({ type: 'PARTIDA_ENCONTRADA', room: roomName });
                p1.ws.send(startMsg);
                p2.ws.send(startMsg);
                console.log(`PARTIDA INICIADA: ${roomName}`);
            }
        }

        // B. MOVIMIENTO EN TIEMPO REAL
        if (data.type === 'MOVIMIENTO' && ws.room) {
            const roomPlayers = activeRooms[ws.room];
            if (roomPlayers) {
                // Reenviar las coordenadas al otro jugador
                roomPlayers.forEach(p => {
                    if (p.ws !== ws) {
                        p.ws.send(JSON.stringify({
                            type: 'ENEMIGO_MOVIDO',
                            x: data.x,
                            y: data.y,
                            angle: data.angle
                        }));
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        waitingPlayers = waitingPlayers.filter(p => p.ws !== ws);
        console.log('JUGADOR DESCONECTADO');
    });
});

// Función para enviar notificaciones vía Firebase FCM
function enviarNotificacionPush(titulo, cuerpo) {
    /* Descomentar cuando subas el firebase-key.json a Railway
    const message = { notification: { title: titulo, body: cuerpo }, topic: 'global_matchmaking' };
    admin.messaging().send(message)
      .then((response) => console.log('Notificación enviada:', response))
      .catch((error) => console.log('Error FCM:', error));
    */
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[+] SERVIDOR SNAKE NEON 3D ONLINE EN EL PUERTO ${PORT}`);
});
