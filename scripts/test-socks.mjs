import net from "node:net";
import { Agent } from "undici";
import { createSocksConnector, parseSocksProxyConfig } from "../src/main/socksProxy.ts";

function startSocks5Server({ requireAuth = false, user = "u", pass = "p", port = 0 } = {}) {
  const server = net.createServer((client) => {
    let stage = "greeting";
    let buffer = Buffer.alloc(0);
    let upstream = null;

    const fail = (code) => {
      client.write(Buffer.from([0x05, code, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
      client.destroy();
    };

    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (stage === "greeting") {
        if (buffer.length < 2) return;
        const count = buffer[1];
        if (buffer.length < 2 + count) return;
        const methods = [...buffer.subarray(2, 2 + count)];
        buffer = buffer.subarray(2 + count);
        if (requireAuth && !methods.includes(0x02)) return fail(0xff);
        if (requireAuth) {
          client.write(Buffer.from([0x05, 0x02]));
          stage = "auth";
        } else {
          client.write(Buffer.from([0x05, 0x00]));
          stage = "request";
        }
        if (buffer.length) onData(Buffer.alloc(0));
        return;
      }
      if (stage === "auth") {
        if (buffer.length < 2) return;
        const userLength = buffer[1];
        if (buffer.length < 2 + userLength + 1) return;
        const gotUser = buffer.subarray(2, 2 + userLength).toString();
        const passLength = buffer[2 + userLength];
        if (buffer.length < 3 + userLength + passLength) return;
        const gotPass = buffer.subarray(3 + userLength, 3 + userLength + passLength).toString();
        buffer = buffer.subarray(3 + userLength + passLength);
        if (gotUser !== user || gotPass !== pass) {
          client.write(Buffer.from([0x01, 0x01]));
          client.destroy();
          return;
        }
        client.write(Buffer.from([0x01, 0x00]));
        stage = "request";
        if (buffer.length) onData(Buffer.alloc(0));
        return;
      }
      if (stage === "request") {
        if (buffer.length < 5) return;
        const atyp = buffer[3];
        let offset = 4;
        let host = "";
        if (atyp === 0x01) {
          if (buffer.length < offset + 4 + 2) return;
          host = [...buffer.subarray(offset, offset + 4)].join(".");
          offset += 4;
        } else if (atyp === 0x03) {
          const length = buffer[offset];
          if (buffer.length < offset + 1 + length + 2) return;
          host = buffer.subarray(offset + 1, offset + 1 + length).toString();
          offset += 1 + length;
        } else {
          return fail(0x08);
        }
        const port = buffer.readUInt16BE(offset);
        stage = "tunnel";
        client.off("data", onData);
        upstream = net.connect({ host, port }, () => {
          client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
          client.pipe(upstream);
          upstream.pipe(client);
        });
        upstream.on("error", () => fail(0x05));
        return;
      }
    };

    client.on("data", onData);
    client.on("error", () => {
      client.destroy();
      upstream?.destroy();
    });
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function startSocks4Server(port = 0) {
  const server = net.createServer((client) => {
    let buffer = Buffer.alloc(0);
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < 8) return;
      const portNumber = buffer.readUInt16BE(2);
      const ip = [...buffer.subarray(4, 8)].join(".");
      let offset = 8;
      const nullIndex = buffer.indexOf(0, offset);
      if (nullIndex < 0) return;
      offset = nullIndex + 1;
      let host = ip;
      if (ip.startsWith("0.0.0.")) {
        const end = buffer.indexOf(0, offset);
        if (end < 0) return;
        host = buffer.subarray(offset, end).toString();
      }
      client.off("data", onData);
      const upstream = net.connect({ host, port: portNumber }, () => {
        client.write(Buffer.from([0x00, 0x5a, 0, 0, 0, 0, 0, 0]));
        client.pipe(upstream);
        upstream.pipe(client);
      });
      upstream.on("error", () => {
        client.write(Buffer.from([0x00, 0x5b, 0, 0, 0, 0, 0, 0]));
        client.destroy();
      });
    };
    client.on("data", onData);
    client.on("error", () => client.destroy());
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

async function fetchThrough(url, proxyUrl) {
  const config = parseSocksProxyConfig(proxyUrl);
  if (!config) throw new Error(`not a socks url: ${proxyUrl}`);
  const agent = new Agent({ connect: createSocksConnector(config), connectTimeout: 20000 });
  const response = await fetch(url, { dispatcher: agent });
  const body = await response.text();
  return { status: response.status, body: body.slice(0, 120) };
}

const plain = await startSocks5Server({});
const auth = await startSocks5Server({ requireAuth: true, user: "demo", pass: "secret" });
const socks4 = await startSocks4Server(0);

try {
  console.log("socks5 no-auth:", await fetchThrough("https://example.com", `socks5://127.0.0.1:${plain.port}`));
  console.log("socks5 auth:", await fetchThrough("https://example.com", `socks5://demo:secret@127.0.0.1:${auth.port}`));
  console.log("socks4a:", await fetchThrough("https://example.com", `socks4a://127.0.0.1:${socks4.port}`));
  console.log("http over socks5:", await fetchThrough("http://example.com", `socks5://127.0.0.1:${plain.port}`));
} finally {
  plain.server.close();
  auth.server.close();
  socks4.server.close();
}
