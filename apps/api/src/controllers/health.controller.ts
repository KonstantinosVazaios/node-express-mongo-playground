import type { Request, Response } from 'express';
import { checkHealth } from '../services/health.service.js';

export async function getHealth(_req: Request, res: Response) {
  const report = await checkHealth();
  // 503 tells Docker / Kubernetes / a load balancer to stop routing traffic here.
  res.status(report.status === 'ok' ? 200 : 503).json(report);
}
