"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoRoute = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const youtube_1 = require("../service/youtube");
exports.VideoRoute = express_1.default.Router();
exports.VideoRoute.use(express_1.default.json());
exports.VideoRoute.use((0, cors_1.default)());
dotenv_1.default.config();
exports.VideoRoute.post("/video_analyse", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Request body:", req.body);
        if (!req.body || !req.body.url) {
            return res.status(400).json({ error: "URL is required in the request body" });
        }
        const url = req.body.url;
        if (!url.includes('youtube.com/watch?v=') && !url.includes('youtu.be/')) {
            return res.status(400).json({ error: "Invalid YouTube URL format" });
        }
        const commentCount = yield (0, youtube_1.getCommentsCount)(url);
        if (commentCount > 5000) {
            return res.status(403).json({ msg: "You Must Be authorised to analyse video" });
        }
        const { video: videoData, comments: rawComments, fetchingStats } = yield (0, youtube_1.fetchVideoData)(url);
        res.status(200).json({ videoData, rawComments, fetchingStats });
    }
    catch (error) {
        console.error("Error analyzing video:", error);
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to analyze video"
        });
    }
}));
