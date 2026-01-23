import net from 'net';

interface PrinterConnectionOptions {
  host: string;
  port: number;
  timeoutMs?: number;
}

export const sendRawToPrinter = (
  payload: Buffer,
  options: PrinterConnectionOptions,
): Promise<void> => {
  const { host, port, timeoutMs = 8000 } = options;

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const finalize = (err?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };

    socket.setTimeout(timeoutMs);

    socket.on('timeout', () => {
      finalize(new Error('Printer connection timed out'));
    });

    socket.on('error', (error) => {
      finalize(error);
    });

    socket.connect(port, host, () => {
      socket.write(payload, (err) => {
        if (err) {
          finalize(err);
          return;
        }
        socket.end();
      });
    });

    socket.on('close', (hadError) => {
      if (hadError) return;
      finalize();
    });
  });
};
