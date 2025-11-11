import { z } from 'zod';

export const searchMkDocSchema = z.object({
  search: z.string().describe('what to search for'),
  version: z.string().optional().describe('version is always semantic 3 digit in the form x.y.z'), 
});

export const searchMkDocSchemaWithoutVersion = z.object({
  search: z.string().describe('what to search for'),
});
