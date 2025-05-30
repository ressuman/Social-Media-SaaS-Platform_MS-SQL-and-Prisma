// File: config/database.js

import { PrismaClient } from "@prisma/client";
import colors from "colors";

// Create a singleton Prisma client instance
class DatabaseConnection {
  constructor() {
    if (DatabaseConnection.instance) {
      return DatabaseConnection.instance;
    }

    this.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "info", "warn", "error"]
          : ["error"],
      errorFormat: "pretty",
    });

    DatabaseConnection.instance = this;
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log("✅ Database connected successfully".green);
      return this.prisma;
    } catch (error) {
      console.error("❌ Database connection failed:".red, error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      console.log("📡 Database disconnected".yellow);
    } catch (error) {
      console.error("❌ Error disconnecting from database:".red, error.message);
    }
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1 as health`;
      return { status: "healthy", timestamp: new Date().toISOString() };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Permission checking helper function
  async checkCombinedPermission(
    userId,
    accountId,
    systemPermission,
    accountPermission
  ) {
    try {
      // Check system-level permission
      const userWithPermissions = await this.prisma.user.findUnique({
        where: {
          id: userId,
          isActive: true,
          deletedAt: null,
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!userWithPermissions) {
        return { hasPermission: false, reason: "User not found or inactive" };
      }

      // Check if user has the required system permission
      const hasSystemPermission = userWithPermissions.role.rolePermissions.some(
        (rp) => rp.permission.name === systemPermission
      );

      if (!hasSystemPermission) {
        return {
          hasPermission: false,
          reason: `User lacks system permission: ${systemPermission}`,
        };
      }

      // Check account-specific permission
      const accountUser = await this.prisma.accountUser.findUnique({
        where: {
          accountId_userId: {
            accountId: accountId,
            userId: userId,
          },
        },
      });

      if (!accountUser) {
        return {
          hasPermission: false,
          reason: "User not associated with this account",
        };
      }

      // Map account permission names to database fields
      const permissionMap = {
        can_create: accountUser.canCreate,
        can_edit: accountUser.canEdit,
        can_delete: accountUser.canDelete,
        can_publish: accountUser.canPublish,
        can_respond: accountUser.canRespond,
        can_analyze: accountUser.canAnalyze,
      };

      const hasAccountPermission = permissionMap[accountPermission];

      if (!hasAccountPermission) {
        return {
          hasPermission: false,
          reason: `User lacks account permission: ${accountPermission}`,
        };
      }

      return {
        hasPermission: true,
        reason: "User has both system and account permissions",
      };
    } catch (error) {
      console.error("Error checking combined permission:".red, error.message);
      return {
        hasPermission: false,
        reason: `Permission check failed: ${error.message}`,
      };
    }
  }

  getPrismaInstance() {
    return this.prisma;
  }
}

// Export singleton instance
export const database = new DatabaseConnection();
export const prisma = database.getPrismaInstance();
export default database;
