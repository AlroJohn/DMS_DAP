import { Request, Response } from 'express';
import { sendRawToPrinter } from '../services/printer.service';

export const printEscPos = async (req: Request, res: Response) => {
  try {
    const { payloadBase64 } = req.body as { payloadBase64?: string };

    if (!payloadBase64 || typeof payloadBase64 !== 'string') {
      return res.status(400).json({ error: 'payloadBase64 is required' });
    }

    const payload = Buffer.from(payloadBase64, 'base64');
    if (payload.length === 0) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const host = process.env.PRINTER_IP || '192.168.1.14';
    const port = Number(process.env.PRINTER_PORT || 9600);

    await sendRawToPrinter(payload, { host, port });

    return res.json({ success: true });
  } catch (error) {
    console.error('Printer error:', error);
    return res.status(502).json({ error: 'Failed to send data to printer' });
  }
};
