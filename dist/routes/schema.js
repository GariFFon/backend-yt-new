"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeVideoSchema = void 0;
const zod_1 = require("zod");
exports.analyzeVideoSchema = zod_1.z.object({
    url: zod_1.z.string().url().refine((url) => {
        return url.includes('youtube.com/watch?v=') || url.includes('youtu.be/') || url.includes('youtube.com/shorts/');
    }, { message: "Must be a valid YouTube URL" })
});
