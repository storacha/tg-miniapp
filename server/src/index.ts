import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./services/auth";
import sessionRoutes from "./services/session";
import backupRoutes from "./services/backup";
import loyaltyRoutes from "./services/loyalty";
import accountRoutes from "./services/account";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());

app.use("/auth", authRoutes);
app.use("/session", sessionRoutes);
app.use("/backup", backupRoutes);
app.use("/loyalty", loyaltyRoutes);
app.use("/account", accountRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
