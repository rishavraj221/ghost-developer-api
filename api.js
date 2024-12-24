import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import agentRoutes from "./routes/assistant.js";
import agileRoutes from "./routes/agile.js";
import homeRoute from "./routes/home.js";
import appServiceV2Route from "./routes/app_service_v2.js";

const app = express();

const API_PREFIX = `/api/v1`;

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.use("/", homeRoute);
app.use(`${API_PREFIX}`, agentRoutes);
app.use(`${API_PREFIX}/agile`, agileRoutes);
app.use(`${API_PREFIX}/app-service-v2`, appServiceV2Route);

export default app;
