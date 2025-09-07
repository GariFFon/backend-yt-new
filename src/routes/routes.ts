import express from "express"
import cors from "cors"
import dotenv from "dotenv";
import {fetchVideoData, getCommentsCount} from "../service/youtube";

export const VideoRoute = express.Router();
VideoRoute.use(express.json());
VideoRoute.use(cors());
dotenv.config();


VideoRoute.post("/video_analyse", async (req, res) => {
    try {
        console.log("Request body:", req.body);
        if (!req.body || !req.body.url) {
            return res.status(400).json({ error: "URL is required in the request body" });
        }
        
        const url = req.body.url;
        if (!url.includes('youtube.com/watch?v=') && !url.includes('youtu.be/')) {
            return res.status(400).json({ error: "Invalid YouTube URL format" });
        }

        const commentCount = await getCommentsCount(url);
        if (commentCount > 5000) {
            return res.status(403).json({ msg: "You Must Be authorised to analyse video" });
        }
        
        const { video: videoData, comments: rawComments, fetchingStats } = await fetchVideoData(url);
        res.status(200).json({ videoData, rawComments, fetchingStats });
    } catch (error) {
        console.error("Error analyzing video:", error);
        res.status(400).json({ 
            error: error instanceof Error ? error.message : "Failed to analyze video" 
        });
    }
});