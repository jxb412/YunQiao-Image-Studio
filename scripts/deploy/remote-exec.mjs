import { Client } from "ssh2";

const HOST = process.env.DEPLOY_HOST || "8.136.208.135";
const USER = process.env.DEPLOY_USER || "root";
const PASSWORD = process.env.DEPLOY_PASSWORD || "";
const command = process.argv.slice(2).join(" ");

const conn = new Client();

conn.on("ready", () => {
  conn.exec(command, (error, stream) => {
    if (error) {
      console.error(`exec failed: ${error.message}`);
      conn.end();
      process.exitCode = 1;
      return;
    }
    let output = "";
    stream.on("data", (chunk) => { output += chunk.toString(); });
    stream.stderr.on("data", (chunk) => { output += chunk.toString(); });
    stream.on("close", (code) => {
      console.log(output.trim());
      console.log(`[exit ${code}]`);
      conn.end();
    });
  });
});

conn.on("error", (error) => {
  console.error(`ssh error: ${error.message}`);
  process.exitCode = 1;
});

conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 30000 });
