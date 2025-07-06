const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");

server.listen(process.env.PORT || 8888);

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

// Socket通信接続
io.on("connection", (socket) => {
  // ルーム入室
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected");

    // オファー取得
    socket.on("offer", (offer) => {
      socket.to(roomId).emit("offer", offer);
    });

    // アンサー取得
    socket.on("answer", (answer) => {
      socket.to(roomId).emit("answer", answer);
    });

    // ICE候補取得
    socket.on("ice-candidate", (candidate) => {
      socket.to(roomId).emit("ice-candidate", candidate);
    });

    // 手動切断
    socket.on("manual-disconnect", () => {
      socket.to(roomId).emit("user-disconnected");
    });

    // 切断
    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected");
    });
  });
});
