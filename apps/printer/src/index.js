const io = require("socket.io-client");
const net = require("net");
const {
  ThermalPrinter,
  PrinterTypes,
  CharacterSet,
  BreakLine,
} = require("node-thermal-printer");

// Replace 'config.socket' with your Socket.IO URL
//const socketUrl = 'https://quanbylab.com:3002';
const socketUrl =
  process.env.NEXT_PUBLIC_PRINTER_SOCKET_URL || "http://localhost:3001"; // Socket.IO typically uses HTTP(S) protocol
const printerToken = process.env.PRINTER_SOCKET_TOKEN;
const socket = io(socketUrl, {
  auth: printerToken ? { token: printerToken } : { printer: true },
  transports: ["websocket"],
  rejectUnauthorized: false,
});

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
  socket.emit("printer:register");
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected from server:", reason);
});

socket.on("error", (error) => {
  console.error("Socket.IO error:", error);
});

// Listen for print job events
socket.on("printJob", async (data) => {
  handlePrintJob(data);
});

// Also listen on the default message event for compatibility
socket.on("message", async (data) => {
  handlePrintJob(data);
});

function testTcpConnection(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

// Main function to handle print jobs
async function handlePrintJob(receivedData) {
  // Decode the incoming message if it's a buffer
  let socketData;
  if (Buffer.isBuffer(receivedData)) {
    const decodedMessage = Buffer.from(receivedData).toString("utf-8");
    socketData = JSON.parse(decodedMessage);
  } else {
    socketData = receivedData;
  }

  // DMS only
  if (socketData.app !== "dms") return;

  if (socketData.data?.event !== "printing") {
    return;
  }

  const { payloadBase64, printer_ip, printer_port } = socketData.data;
  const printerHost = printer_ip || process.env.PRINTER_IP || "192.168.1.14";
  const printerPort = Number(printer_port || process.env.PRINTER_PORT || 9600);

  console.log(
    "Printer job received:",
    socketData.jobId || "unknown",
    `${printerHost}:${printerPort}`,
  );

  const canConnect = await testTcpConnection(printerHost, printerPort, 3000);
  if (!canConnect) {
    console.log("Printer not reachable on TCP port");
    socket.emit("printError", {
      jobId: socketData.jobId || "unknown",
      error: "Printer unreachable on TCP port",
    });
    return;
  }

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${printerHost}:${printerPort}`,
    options: {
      timeout: 3000, // Give it a bit more time to handshake
    },
    width: 48, // Number of characters in one line - default: 48
    characterSet: CharacterSet.SLOVENIA, // Character set - default: SLOVENIA
    breakLine: BreakLine.NONE, // Break line after WORD or CHARACTERS. Disabled with NONE - default: WORD
    removeSpecialCharacters: false, // Removes special characters - default: false
    lineCharacter: "-", // Use custom character for drawing lines - default: -
  });

  const isConnected = await printer.isPrinterConnected();
  console.log("Printer connected:", isConnected);

  try {
    if (!payloadBase64 || typeof payloadBase64 !== "string") {
      throw new Error("payloadBase64 is required");
    }

    const payload = Buffer.from(payloadBase64, "base64");
    if (!payload.length) {
      throw new Error("Empty payload");
    }

    printer.clear();
    printer.add(payload);
    const result = await printer.execute();
    console.log("Print sent successfully:", result);

    // Emit success event back to server if needed
    socket.emit("printSuccess", {
      jobId: socketData.jobId || "unknown",
      status: "completed",
      message: "Printed!",
    });
  } catch (error) {
    console.error("Print error:", error);

    // Emit error event back to server if needed
    socket.emit("printError", {
      jobId: socketData.jobId || "unknown",
      error: error.message,
    });
  }
}

console.log("Printer server is running...");
