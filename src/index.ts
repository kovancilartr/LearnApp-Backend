import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.routes";
import { userRoutes } from "./routes/user.routes";
import profileRoutes from "./routes/profile.routes";
import courseRoutes from "./routes/course.routes";
import { progressRoutes } from "./routes/progress.routes";
import quizRoutes from "./routes/quiz.routes";
import { fileRoutes } from "./routes/file.routes";
import notificationRoutes from "./routes/notification.routes";
import enrollmentRoutes from "./routes/enrollment.routes";
import analyticsRoutes from "./routes/analytics.routes";
import parentRoutes from "./routes/parent.routes";

// Import middleware
import { errorHandler } from "./middleware/error.middleware";
import { createUploadDirectories } from "./config/storage";

// Load environment variables
dotenv.config();

// Initialize upload directories
createUploadDirectories();

const app = express();
const PORT = process.env.PORT || 3002;

// Basic middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan("combined")); // Logging
app.use(express.json({ limit: "10mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LearnApp Backend API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API routes
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LearnApp API v1.0.0",
    endpoints: {
      health: "/health",
      api: "/api",
      auth: "/api/auth",
      users: "/api/users",
      profile: "/api/profile",
      courses: "/api/courses",
      progress: "/api/progress",
      quizzes: "/api/quizzes",
      files: "/api/files",
      notifications: "/api/notifications",
      enrollments: "/api/enrollments",
      analytics: "/api/analytics",
      parent: "/api/parent",
    },
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// User management routes
app.use("/api", userRoutes);

// Profile management routes
app.use("/api/profile", profileRoutes);

// Course management routes
app.use("/api/courses", courseRoutes);

// Progress tracking routes
app.use("/api/progress", progressRoutes);

// Quiz management routes
app.use("/api/quizzes", quizRoutes);

// File management routes
app.use("/api/files", fileRoutes);

// Notification management routes
app.use("/api/notifications", notificationRoutes);

// Enrollment management routes
app.use("/api/enrollments", enrollmentRoutes);

// Analytics routes
app.use("/api/analytics", analyticsRoutes);

// Parent routes
app.use("/api/parent", parentRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    },
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 LearnApp Backend server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
