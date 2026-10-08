import { z } from 'zod';

const DependencyStatusSchema = z.enum(['up', 'down']);

export const HealthSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    uptimeSeconds: z.number().int(),
    checks: z.object({ mongo: DependencyStatusSchema, redis: DependencyStatusSchema }),
  })
  .meta({ id: 'Health' });

export type HealthReport = z.infer<typeof HealthSchema>;
