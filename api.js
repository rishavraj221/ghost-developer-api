import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import agentRoutes from "./routes/assistant.js";
import homeRoute from "./routes/home.js";

const app = express();

const API_PREFIX = `/api/v1`;

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.use("/", homeRoute);
app.use(`${API_PREFIX}`, agentRoutes);

export default app;
