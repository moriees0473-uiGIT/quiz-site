import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Next.jsを初期化
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  // Socket.IO サーバーの設定（CORS対応版）
  const io = new Server(httpServer, {
    cors: {
      origin: "*", 
    }
  });

  io.on("connection", (socket) => {
    console.log("接続されました:", socket.id);

    // 状態変更を受け取って全員に送る
    socket.on("change_status", (newStatus) => {
      console.log("状態変更を受信:", newStatus);
      io.emit("status_changed", newStatus);
    });

    socket.on("disconnect", () => {
      console.log("切断されました:", socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});