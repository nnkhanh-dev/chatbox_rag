import express from "express";
import cors from "cors";
import routes from "./routes/app.routes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, "../frontend")));

// API routes
app.use("/api", routes);

export default app;