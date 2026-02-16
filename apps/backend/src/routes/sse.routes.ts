import { Router, Request, Response } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth-middleware';

const router = Router();

const writeEvent = (res: Response, event: string, data: Record<string, unknown>) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

router.get('/sse', optionalAuth, (req: Request, res: Response) => {
  const accept = req.headers.accept || '';

  if (!accept.includes('text/event-stream')) {
    res.status(204).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const authReq = req as AuthRequest;
  const userId = authReq.user?.id ?? null;

  writeEvent(res, 'connected', {
    at: new Date().toISOString(),
    userId,
  });

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

export default router;
