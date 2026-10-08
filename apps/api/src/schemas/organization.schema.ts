import { z } from 'zod';

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type OrganizationDto = z.infer<typeof OrganizationSchema>;
