import SftpClient from "ssh2-sftp-client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const HOST = process.env.DEPLOY_HOST || "8.136.208.135";
const USER = process.env.DEPLOY_USER || "root";
const PASSWORD = process.env.DEPLOY_PASSWORD || "";
const ROOT = process.env.DEPLOY_ROOT || "/www/wwwroot/down.haowucm.cn";
const command = process.argv[2] || "list";

const client = new SftpClient("yunqiao-deploy");

async function main() {
  await client.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 30000 });
  console.log(`connected ${USER}@${HOST}`);

  if (command === "list") {
    const listing = await client.list(ROOT);
    for (const item of listing) {
      const type = item.type === "d" ? "DIR " : "FILE";
      console.log(`${type} ${String(item.size).padStart(12)} ${item.modifyTime} ${item.name}`);
    }
  } else if (command === "cat") {
    const target = path.posix.join(ROOT, process.argv[3]);
    const buffer = await client.get(target);
    console.log(buffer.toString("utf-8"));
  } else if (command === "ls-releases") {
    const dir = path.posix.join(ROOT, process.argv[3] || "releases");
    const listing = await client.list(dir).catch((error) => {
      console.log(`missing ${dir}: ${error.message}`);
      return [];
    });
    for (const item of listing) {
      console.log(`${item.type === "d" ? "DIR " : "FILE"} ${String(item.size).padStart(12)} ${item.modifyTime} ${item.name}`);
    }
  } else if (command === "mkdir") {
    await client.mkdir(path.posix.join(ROOT, process.argv[3]), true);
    console.log(`mkdir ok ${process.argv[3]}`);
  } else if (command === "put") {
    const local = process.argv[3];
    const remote = path.posix.join(ROOT, process.argv[4]);
    await client.fastPut(local, remote);
    console.log(`uploaded ${local} -> ${remote}`);
  } else if (command === "read-remote-json") {
    const target = path.posix.join(ROOT, process.argv[3]);
    const text = (await client.get(target)).toString("utf-8");
    console.log(text);
  } else if (command === "put-local-json") {
    const local = process.argv[3];
    const remote = path.posix.join(ROOT, process.argv[4]);
    await client.put(await readFile(local), remote);
    console.log(`uploaded ${local} -> ${remote}`);
  }
}

main()
  .catch((error) => {
    console.error(`FAILED: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
