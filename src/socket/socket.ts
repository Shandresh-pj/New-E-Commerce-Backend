import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export let io: Server;

export const initializeSocket = (
  server: any,
  getUserDetails: any,
  trackingRepo?: any
) => {

  io = new Server(server, {
    path: "/ws",
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  // ==========================================
  // AUTH
  // ==========================================

  io.use(async (socket: any, next) => {

    try {

      const token =
        socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error("Token missing")
        );
      }

      try {

        const decoded: any =
          jwt.verify(
            token,
            process.env.JWT_SECRET!
          );

        socket.user = decoded;

        return next();

      } catch {

        const user =
          await getUserDetails(
            token,
            socket,
            null
          );

        if (!user) {
          return next(
            new Error("Invalid token")
          );
        }

        socket.user = user;

        return next();
      }

    } catch (err) {

      return next(err as any);
    }
  });

  // ==========================================
  // CONNECTION
  // ==========================================

  io.on(
    "connection",
    (socket: any) => {

      console.log(
        `✅ Socket Connected: ${socket.id}`
      );

      const user =
        socket.user;

      const role =
        user?.usertype;

      // ==========================================
      // SUPER ADMIN
      // ==========================================

      if (role === "Super_Admin") {

        socket.join(
          "super_admin"
        );
      }

      // ==========================================
      // ADMIN
      // ==========================================

      if (role === "Admin") {

        socket.join(
          `company_${user.company_id}`
        );

        socket.join(
          `admin_${user.id}`
        );
      }

      // ==========================================
      // BRANCH MANAGER
      // ==========================================

      if (
        role === "Branch_Manager"
      ) {

        socket.join(
          `company_${user.company_id}`
        );

        socket.join(
          `branch_${user.branch_id}`
        );
      }

      // ==========================================
      // SHOP KEEPER
      // ==========================================

      if (
        role === "Shop_Keeper"
      ) {

        socket.join(
          `branch_${user.branch_id}`
        );
      }

      // ==========================================
      // DELIVERY BOY
      // ==========================================

      if (
        role === "Delivery_Boy"
      ) {

        socket.join(
          `delivery_${user.id}`
        );

        socket.join(
          `branch_${user.branch_id}`
        );
      }

      // ==========================================
      // CUSTOMER
      // ==========================================

      if (
        role === "Customer"
      ) {

        socket.join(
          `user_${user.id}`
        );
      }

      // ==========================================
      // TRACK PRODUCT
      // ==========================================

      socket.on(
        "track-product",
        (data: any) => {

          socket.join(
            `product_${data.product_id}`
          );
        }
      );

      // ==========================================
      // JOIN BRANCH
      // ==========================================

      socket.on(
        "join-branch",
        (data: any) => {

          socket.join(
            `branch_${data.branch_id}`
          );
        }
      );

      // ==========================================
      // JOIN ORDER ROOM
      // ==========================================

      socket.on(
        "track-order",
        (data: any) => {

          socket.join(
            `order_${data.order_id}`
          );
        }
      );

      // ==========================================
      // DELIVERY BOY LIVE GPS
      // ==========================================

      socket.on(
        "update-location",
        async (data: any) => {

          try {

            if (trackingRepo) {

              await trackingRepo.save({
                order_id:
                  data.order_id,

                delivery_boy_id:
                  user.id,

                latitude:
                  data.lat,

                longitude:
                  data.lng,

                company_id:
                  user.company_id,

                branch_id:
                  user.branch_id,
              });
            }

            io.to(
              `order_${data.order_id}`
            ).emit(
              "live-location",
              {
                order_id:
                  data.order_id,

                lat:
                  data.lat,

                lng:
                  data.lng,

                updated_at:
                  new Date(),
              }
            );

          } catch (error) {

            console.error(
              error
            );
          }
        }
      );

      // ==========================================
      // STOCK UPDATE
      // ==========================================

      socket.on(
        "stock-update",
        (data: any) => {

          io.to(
            `company_${data.company_id}`
          ).emit(
            "stock-updated",
            data
          );
        }
      );

      // ==========================================
      // LOW STOCK ALERT
      // ==========================================

      socket.on(
        "low-stock-alert",
        (data: any) => {

          io.to(
            `company_${data.company_id}`
          ).emit(
            "low-stock",
            data
          );
        }
      );

      // ==========================================
      // ATTENDANCE UPDATE
      // ==========================================

      socket.on(
        "attendance-update",
        (data: any) => {

          io.to(
            `company_${data.company_id}`
          ).emit(
            "attendance-changed",
            data
          );
        }
      );

      // ==========================================
      // LEAVE REQUEST
      // ==========================================

      socket.on(
        "leave-request",
        (data: any) => {

          io.to(
            `company_${data.company_id}`
          ).emit(
            "leave-applied",
            data
          );
        }
      );

      // ==========================================
      // DISCONNECT
      // ==========================================

      socket.on(
        "disconnect",
        () => {

          console.log(
            `❌ Socket Disconnected: ${socket.id}`
          );
        }
      );
    }
  );

  return io;
};