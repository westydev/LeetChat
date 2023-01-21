const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require("mongoose");
const User = require("./User")

let Clients = [];


function removeItemAll(arr, value) {
  var i = 0;
  while (i < arr.length) {
    if (arr[i] === value) {
      arr.splice(i, 1);
    } else {
      ++i;
    }
  }
  return arr;
}

function setTitle(title) {
  if (process.platform == "win32") {
    process.title = title;
  } else {
    process.stdout.write("\x1b]2;" + title + "\x1b\x5c");
  }
}

app.get(`/api/checkAccount/:username/:password`, async (req, res) => {
    const username = req.params.username;
    const password = req.params.password;

    const user = await User.findOne({ name: username, password: password });

    if(user) {
        res.send({ enabled: true })
    } else {
        res.send({ enabled: false })
    }
});

app.get(`/api/createAccount/:username/:password`, async (req, res) => {
  const username = req.params.username;
  const password = req.params.password;
  const ipHeader = req.headers["x-forwarded-for"] || req.connection.remoteAddress
  const ip = ipHeader.replace("::ffff:", "");

  const user = await User.findOne({ name: username, ip: ip });
  const ipc = await User.findOne({ ip: ip });

  if(user || ipc) {
      res.send({ msg: "Zaten Böyle Bir Hesap Mevcut.", code: 0 })
  }
  if(!user && !ipc) {
    const nUser = new User({
      name: username,
      password: password,
      ip: ip
    })
    nUser.save()
    res.send({ msg: "Hesap Başarıyla Oluşturuldu.", code: 1 })
  }
});

app.get(`/api/addMessageForAccount/:username/:password`, async (req, res) => {
  const username = req.params.username;
  const password = req.params.password;

  const user = await User.findOne({ name: username, password: password });

  if (user) {
      await User.findOneAndUpdate({ name: username, password: password }, { $inc: { messageSize: 1 } }, { upsert: true });
  } else {
    res.send({ enabled: false });
  }
});

app.get(`/api/getUserMessages/:username/:password`, async (req, res) => {
  const username = req.params.username;
  const password = req.params.password;

  const user = await User.findOne({ name: username, password: password });

  if (user) {
    res.send({ size: user.messageSize });
  }
});

app.get(`/api/onileClients`, async (req, res) => {
  res.send({ size: Clients.length })
});

io.on("connection", async (socket) => {

  const UserOptions = socket.handshake;

  const user = await User.findOne({ name: UserOptions.auth.username, password: UserOptions.auth.password });

  if(!user) return socket.disconnect();

  Clients.push(UserOptions)
  setTitle(`Onile Users ${Clients.length}`)
  console.log(UserOptions.auth.username + " Connected To Chat");
  io.sockets.emit("broadcast", UserOptions.auth.username + " Connected To Chat");

  socket.on(`chatmessage`, message => {
    //console.log(message);
    socket.emit("chatmessage", message);

    io.sockets.emit("broadcast", message);
  });
  socket.on("disconnect", () => {
    io.sockets.emit("broadcast", UserOptions.auth.username + " Disconnected To Chat");
    removeItemAll(Clients, UserOptions);
    setTitle(`Onile Users ${Clients.length}`)
 }); 
});

server.listen(3000, async () => {
  console.log("listening on *:3000");
  await mongoose.connect(`mongodb://localhost:27017`)
});