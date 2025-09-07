import express from "express"
import cors from "cors"
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

import { VideoRoute } from "./routes/routes"

// Remove the duplicate "/api" prefix
app.use("/api/v1", VideoRoute);

// Add error handling for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

export default app;