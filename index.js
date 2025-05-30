// File: index.js

import express from "express";
import cors from "cors";
import colors from "colors";
import morgan from "morgan";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Database connection
import { PrismaClient } from "@prisma/client";

// Route imports
// import authRoutes from "./routes/authRoutes.js";
// import userRoutes from "./routes/userRoutes.js";
// import platformRoutes from "./routes/platformRoutes.js";
// import accountRoutes from "./routes/accountRoutes.js";
// import permissionRoutes from "./routes/permissionRoutes.js";

// Middleware imports
//import { errorHandler } from "./middleware/errorHandler.js";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Prisma Client
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Morgan Logging (colored for development)
if (process.env.NODE_ENV === "development") {
  // Colorful dev logging to console
  app.use(
    morgan((tokens, req, res) => {
      return [
        colors.cyan(tokens.method(req, res)),
        colors.yellow(tokens.url(req, res)),
        colors.green(tokens.status(req, res)),
        colors.magenta(tokens["response-time"](req, res) + "ms"),
      ].join(" ");
    })
  );
} else {
  // Standard logging to access.log file in production
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, "../logs/access.log"),
    { flags: "a" }
  );
  app.use(morgan("combined", { stream: accessLogStream }));
}

// API Routes
// app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/users", userRoutes);
// app.use("/api/v1/platforms", platformRoutes);
// app.use("/api/v1/accounts", accountRoutes);
// app.use("/api/v1/permissions", permissionRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>Social Media SaaS Platform</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .endpoints { margin-top: 20px; }
          .endpoint { background: #1f2937; color: #f9fafb; padding: 8px 12px; border-radius: 4px; margin: 4px 0; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Social Media SaaS Platform API</h1>
            <p>A comprehensive social media management platform with role-based access control</p>
          </div>

          <div class="info">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
            <p><strong>Database:</strong> Microsoft SQL Server with Prisma ORM</p>
            <p><strong>API Base:</strong> <code>/api/v1</code></p>
          </div>

          <div class="endpoints">
            <h3>Available Endpoints:</h3>
            <div class="endpoint">POST /api/v1/auth/register - User Registration</div>
            <div class="endpoint">POST /api/v1/auth/login - User Login</div>
            <div class="endpoint">GET /api/v1/users - Get Users</div>
            <div class="endpoint">GET /api/v1/platforms - Get Social Platforms</div>
            <div class="endpoint">GET /api/v1/accounts - Get Social Accounts</div>
            <div class="endpoint">GET /api/v1/permissions - Get Permissions</div>
            <div class="endpoint">GET /health - Health Check</div>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1 as connected`;

    res.status(200).json({
      status: "OK",
      message: "Social Media SaaS Platform API is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: "Connected",
      version: "1.0.0",
    });
  } catch (error) {
    console.error("❌ Health check failed:", error.message.red);
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Test database connection endpoint
app.get("/test-db", async (req, res) => {
  try {
    const result =
      await prisma.$queryRaw`SELECT GETDATE() as current_time, DB_NAME() as database_name`;

    res.status(200).json({
      message: "Database connection successful via Prisma",
      currentTime: result[0].current_time,
      database: result[0].database_name,
      prismaVersion: "5.8.0",
    });
  } catch (error) {
    console.error("❌ Database connection error:", error.message.red);
    res.status(500).json({
      error: "Database connection failed",
      details: error.message,
    });
  }
});

// Error handling middleware (must be last)
//app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The route ${req.originalUrl} does not exist on this server`,
    availableRoutes: [
      "/api/v1/auth",
      "/api/v1/users",
      "/api/v1/platforms",
      "/api/v1/accounts",
      "/api/v1/permissions",
    ],
  });
});

// Database connection and server initialization
const initializeApp = async () => {
  try {
    console.log("🚀 Starting Social Media SaaS Platform API...".cyan.bold);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`.blue);
    console.log(`🖥️  Server: ${process.env.HOST}:${process.env.PORT}`.yellow);

    // Test database connection
    await prisma.$connect();
    console.log("✅ Prisma database connection established".green);

    // Test with a simple query
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log("✅ Database query test successful".green);

    // Start server
    app.listen(process.env.PORT, process.env.HOST, () => {
      console.log(`🎉 Server running at ${process.env.HOST_URL}`.rainbow);
      console.log(
        `📡 API Base URL: ${process.env.HOST_URL}/api/v1`.bgMagenta.italic
          .underline
      );
      console.log("✨ Ready to accept connections!".bold.green);
    });
  } catch (error) {
    console.error(
      "💥 Failed to start application:".red.bold,
      error.message.red
    );
    console.error("Stack trace:".gray, error.stack);
    process.exit(1);
  }
};

// Global error handlers
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:".bgRed.white, error.message);
  console.error("Stack trace:".gray, error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:".bgRed.white, promise);
  console.error("Reason:".gray, reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

// Initialize the application
initializeApp();

export default app;
