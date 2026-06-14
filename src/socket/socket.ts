import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

export const initializeSocket = (
  server: any,
  getUserDetails: any
) => {
  const io = new Server(server, {
    path: '/pjsv',
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  io.use(async (socket: any, next: any) => {
    try {
      const token =
        socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error('Authentication token missing')
        );
      }

      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        );

        socket.user = decoded;

        return next();
      } catch (jwtError) {
        const user = await getUserDetails(
          token,
          socket,
          null
        );

        if (!user) {
          return next(
            new Error('Invalid token')
          );
        }

        socket.user = user;

        return next();
      }
    } catch (err) {
      return next(err);
    }
  });

  io.on('connection', (socket: any) => {
    console.log(
      `Socket Connected : ${socket.id}`
    );

    socket.emit(
      'connected',
      socket.user
    );

    socket.on('disconnect', () => {
      console.log(
        `Socket Disconnected : ${socket.id}`
      );
    });
  });

  return io;
};