import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import adminRoutes from "./routes/admin.routes";
import { syncExistingUsers, seedDefaultAdminAndRoles } from "./services/admin.service";

const app = express();

// Ensure existing users are synced and default admin/roles are seeded on startup
(async () => {
  try {
    await syncExistingUsers();
    await seedDefaultAdminAndRoles();
  } catch (err) {
    console.error("Startup initialization error:", err);
  }
})();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);

export default app;

