import net from "node:net";
import tls from "node:tls";

export const SOCKS_PROTOCOLS = new Set(["socks:", "socks4:", "socks4a:", "socks5:", "socks5h:"]);

export type SocksProxyConfig = {
  version: 4 | 5;
  host: string;
  port: number;
  username: string;
  password: string;
  remoteDns: boolean;
};

export function parseSocksProxyConfig(proxyUrl: string): SocksProxyConfig | null {
  let parsed: URL;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    return null;
  }
  const protocol = parsed.protocol.toLowerCase();
  if (!SOCKS_PROTOCOLS.has(protocol)) return null;
  return {
    version: protocol.startsWith("socks4") ? 4 : 5,
    host: parsed.hostname.replace(/^\[|\]$/g, ""),
    port: Number(parsed.port) || 1080,
    username: decodeURIComponent(parsed.username || ""),
    password: decodeURIComponent(parsed.password || ""),
    remoteDns: protocol === "socks5h:" || protocol === "socks4a:" || protocol === "socks5:" || protocol === "socks4:"
  };
}

type SocketReader = {
  read: (size: number) => Promise<Buffer>;
  dispose: () => void;
};

function createSocketReader(socket: net.Socket): SocketReader {
  let buffer = Buffer.alloc(0);
  let pending: { size: number; resolve: (chunk: Buffer) => void; reject: (error: Error) => void } | null = null;

  const flush = () => {
    if (!pending || buffer.length < pending.size) return;
    const chunk = buffer.subarray(0, pending.size);
    buffer = buffer.subarray(pending.size);
    const { resolve } = pending;
    pending = null;
    resolve(chunk);
  };

  const onData = (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    flush();
  };
  const onError = (error: Error) => {
    if (pending) {
      const { reject } = pending;
      pending = null;
      reject(error);
    }
  };
  const onClose = () => onError(new Error("SOCKS 代理连接已关闭"));

  socket.on("data", onData);
  socket.on("error", onError);
  socket.on("close", onClose);

  return {
    read: (size: number) => new Promise<Buffer>((resolve, reject) => {
      pending = { size, resolve, reject };
      flush();
    }),
    dispose: () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    }
  };
}

function socks5AddressBuffer(host: string, remoteDns: boolean): Buffer {
  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    return Buffer.from([0x01, ...host.split(".").map((part) => Number(part) & 0xff)]);
  }
  if (ipVersion === 6) {
    const groups: number[] = [];
    host.split(":").forEach((group) => {
      const value = Number.parseInt(group || "0", 16);
      groups.push((value >> 8) & 0xff, value & 0xff);
    });
    return Buffer.from([0x04, ...groups.slice(0, 16)]);
  }
  if (!remoteDns) {
    throw new Error("SOCKS5 本地解析模式需要目标是 IP；请改用 socks5:// 或 socks5h://");
  }
  const name = Buffer.from(host.slice(0, 255), "utf-8");
  return Buffer.concat([Buffer.from([0x03, name.length]), name]);
}

async function socks5Handshake(socket: net.Socket, config: SocksProxyConfig, host: string, port: number) {
  const reader = createSocketReader(socket);
  try {
    const needAuth = Boolean(config.username || config.password);
    socket.write(Buffer.from(needAuth ? [0x05, 0x02, 0x00, 0x02] : [0x05, 0x01, 0x00]));
    const methodReply = await reader.read(2);
    if (methodReply[0] !== 0x05) throw new Error("SOCKS5 代理协议握手失败");
    const method = methodReply[1];
    if (method === 0xff) throw new Error("SOCKS5 代理拒绝所有认证方式");
    if (method === 0x02) {
      const user = Buffer.from(config.username, "utf-8");
      const pass = Buffer.from(config.password, "utf-8");
      socket.write(Buffer.concat([Buffer.from([0x01, user.length]), user, Buffer.from([pass.length]), pass]));
      const authReply = await reader.read(2);
      if (authReply[1] !== 0x00) throw new Error("SOCKS5 代理账号或密码错误");
    } else if (method !== 0x00) {
      throw new Error(`SOCKS5 代理返回不支持的认证方式 0x${method.toString(16)}`);
    }

    const portBuffer = Buffer.alloc(2);
    portBuffer.writeUInt16BE(port, 0);
    socket.write(Buffer.concat([Buffer.from([0x05, 0x01, 0x00]), socks5AddressBuffer(host, config.remoteDns), portBuffer]));

    const replyHead = await reader.read(4);
    if (replyHead[0] !== 0x05) throw new Error("SOCKS5 代理响应格式异常");
    const code = replyHead[1];
    if (code !== 0x00) throw new Error(`SOCKS5 代理连接目标失败：${socks5ErrorMessage(code)}`);
    const addressType = replyHead[3];
    if (addressType === 0x01) {
      await reader.read(4 + 2);
    } else if (addressType === 0x04) {
      await reader.read(16 + 2);
    } else {
      const length = (await reader.read(1))[0];
      await reader.read(length + 2);
    }
  } finally {
    reader.dispose();
  }
}

function socks5ErrorMessage(code: number) {
  const map: Record<number, string> = {
    0x01: "代理服务器内部错误",
    0x02: "规则不允许连接",
    0x03: "网络不可达",
    0x04: "主机不可达",
    0x05: "目标拒绝连接",
    0x06: "TTL 过期",
    0x07: "不支持的命令",
    0x08: "不支持的地址类型"
  };
  return map[code] ?? `未知错误 0x${code.toString(16)}`;
}

async function socks4Handshake(socket: net.Socket, config: SocksProxyConfig, host: string, port: number) {
  const reader = createSocketReader(socket);
  try {
    const portBuffer = Buffer.alloc(2);
    portBuffer.writeUInt16BE(port, 0);
    const userBuffer = Buffer.from(config.username, "utf-8");
    const isIpv4 = net.isIP(host) === 4;
    const ipBuffer = isIpv4 ? Buffer.from(host.split(".").map((part) => Number(part) & 0xff)) : Buffer.from([0, 0, 0, 1]);
    const parts = [Buffer.from([0x04, 0x01]), portBuffer, ipBuffer, userBuffer, Buffer.from([0x00])];
    if (!isIpv4) {
      parts.push(Buffer.from(`${host}\0`, "utf-8"));
    }
    socket.write(Buffer.concat(parts));
    const reply = await reader.read(8);
    if (reply[1] !== 0x5a) throw new Error(`SOCKS4 代理连接目标失败：${reply[1] === 0x5b ? "请求被拒绝" : `状态码 0x${reply[1].toString(16)}`}`);
  } finally {
    reader.dispose();
  }
}

async function connectThroughSocks(config: SocksProxyConfig, host: string, port: number) {
  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const pending = net.connect({ host: config.host, port: config.port });
    const timer = setTimeout(() => {
      pending.destroy();
      reject(new Error(`连接 SOCKS 代理超时：${config.host}:${config.port}`));
    }, 15000);
    pending.once("connect", () => {
      clearTimeout(timer);
      resolve(pending);
    });
    pending.once("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`连接 SOCKS 代理失败：${error.message}`));
    });
  });
  try {
    if (config.version === 4) {
      await socks4Handshake(socket, config, host, port);
    } else {
      await socks5Handshake(socket, config, host, port);
    }
    return socket;
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

type ConnectorOptions = {
  hostname?: string;
  host?: string;
  protocol?: string;
  port?: string | number;
  servername?: string;
};

export function createSocksConnector(config: SocksProxyConfig) {
  return (options: ConnectorOptions, callback: (error: Error | null, socket?: net.Socket | tls.TLSSocket) => void) => {
    const targetHost = options.hostname || options.host || "";
    const isSecure = options.protocol === "https:";
    const targetPort = Number(options.port) || (isSecure ? 443 : 80);
    void (async () => {
      const raw = await connectThroughSocks(config, targetHost, targetPort);
      if (!isSecure) return raw;
      const secured = tls.connect({
        socket: raw,
        servername: options.servername || targetHost,
        ALPNProtocols: ["http/1.1"]
      });
      await new Promise<void>((resolve, reject) => {
        secured.once("secureConnect", () => resolve());
        secured.once("error", (error) => reject(error));
      });
      return secured;
    })().then(
      (socket) => callback(null, socket),
      (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)))
    );
  };
}



