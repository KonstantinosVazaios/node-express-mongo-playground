import { z } from 'zod';

export const OrganizationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  })
  .meta({ id: 'Organization' });

export type OrganizationDto = z.infer<typeof OrganizationSchema>;
