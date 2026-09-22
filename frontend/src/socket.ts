import { io } from 'socket.io-client';

// Connect to current origin (Vite proxy forwards /socket.io to backend 5000)
export const socket = io(window.location.origin, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
});
