import { z } from 'zod';

export const fetchMkDocSchema = z.object({
  url: z.string().url(),
});
