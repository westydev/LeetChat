const { io } = require("socket.io-client");
const fetch = require("node-fetch");
const readline = require("readline");
const chalk = require("chalk")

function setTitle(title) {
  if (process.platform == "win32") {
    process.title = title;
  } else {
    process.stdout.write("\x1b]2;" + title + "\x1b\x5c");
  }
}

const Url = `localhost:3000`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function message({ username, password, message, socket }) {
  switch (message) {
    case '/clear':
      console.clear()
      break; 
    default:
      sendMessage({ username: username, password: password, socket: socket, message: message });
      break;
  }
}

async function sendMessage({ username, password, message, socket }) {
  socket.emit("chatmessage", `[${username}] > ${message}`);
  await fetch(`http://${Url}/api/addMessageForAccount/${username}/${password}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

 const Choices = `
           ${chalk.default.red(`[`)}1${chalk.default.red(`]`)} Login Account
           ${chalk.default.red(`[`)}2${chalk.default.red(`]`)} Create Account
`;

console.log(Choices);

async function  returnLoginPage() {
  rl.question("What is your Username? ", async function (username) {
    rl.question("What is your Password? ", async function (password) {
      rl.close();

      const responseUser = await fetch(
        `http://${Url}/api/checkAccount/${username}/${password}`
      );
      const data = await responseUser.json();

      if (data.enabled == false) {
        console.clear();
        process.exit(0);
      }

      const socket = io(`ws://${Url}`, {
        reconnectionDelayMax: 10000,

        auth: {
          username: username,
          password: password,
        },
      });
      console.clear();

      const responseUsers = await fetch(
        `http://${Url}/api/getUserMessages/${username}/${password}`
      );
      const dataa = await responseUsers.json();
      setTitle(`Username: ${username} | Total Messages ${dataa.size}`);

      var messageReader = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      messageReader.on("line", (line) => {
        if (line.length == 0) return;
        message({
          message: line,
          username: username,
          password: password,
          socket: socket,
        });
      });

      setInterval(async () => {
        const responseUser = await fetch(
          `http://${Url}/api/getUserMessages/${username}/${password}`
        );
        const data = await responseUser.json();

        const onileUsersGet = await fetch(`http://${Url}/api/onileClients`);
        const onileUserData = await onileUsersGet.json();
        setTitle(
          `Username: ${username} | Total Messages ${data.size} | Onile Users ${onileUserData.size}`
        );
      }, 10000);
      socket.on("broadcast", (broadcast) => {
        console.log(broadcast);
      });
    });
  });
}

async function returnRegisterPage() {
   rl.question("What is your Username? ", async function (username) {
     rl.question("What is your Password? ", async function (password) {
       rl.close();

       const responseUser = await fetch(
         `http://${Url}/api/createAccount/${username}/${password}`
       );

       const data = await responseUser.json();

       if (data.code == 0) {
         console.log(chalk.default.red(data.msg));
         await sleep(3000);
         console.clear();
         process.exit(0);
       }
       if (data.code == 1) {
         console.log(chalk.default.green(data.msg));
         await sleep(3000);
         console.clear();
         process.exit(0);
       }
     });
   });
};


rl.question("What is your Choice? ", async function (choice) {
  console.clear()
  if(choice == "1") {
    await returnLoginPage();
  }
  if(choice == "2") {
    await returnRegisterPage();
  }
});