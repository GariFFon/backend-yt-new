import { z } from 'zod';

export const analyzeVideoSchema = z.object({
  url: z.string().url().refine((url) => {
    return url.includes('youtube.com/watch?v=') || url.includes('youtu.be/') || url.includes('youtube.com/shorts/');
  }, { message: "Must be a valid YouTube URL" })
});