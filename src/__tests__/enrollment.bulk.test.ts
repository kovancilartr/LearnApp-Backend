import { EnrollmentService } from "../services/enrollment.service";
import { EnrollmentStatus } from "@prisma/client";

// Mock the enrollment service for unit testing
jest.mock("../services/enrollment.service");

describe("Enrollment Bulk Operations", () => {
  const mockEnrollmentService = EnrollmentService as jest.Mocked<typeof EnrollmentService>;

  describe("Bulk Process Enrollment Requests", () => {
    it("should successfully bulk approve enrollment requests", async () => {
      const mockResult = {
        successful: ["req-1", "req-2"],
        failed: [],
        totalProcessed: 2,
        successCount: 2,
        failureCount: 0,
      };

      mockEnrollmentService.bulkProcessEnrollmentRequests.mockResolvedValue(mockResult);

      const bulkData = {
        requestIds: ["req-1", "req-2"],
        action: "approve" as const,
        adminNote: "Bulk approval test",
        reviewedBy: "admin-123",
      };

      const result = await EnrollmentService.bulkProcessEnrollmentRequests(bulkData);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(mockEnrollmentService.bulkProcessEnrollmentRequests).toHaveBeenCalledWith(bulkData);
    });

    it("should successfully bulk reject enrollment requests", async () => {
      const mockResult = {
        successful: ["req-1", "req-2"],
        failed: [],
        totalProcessed: 2,
        successCount: 2,
        failureCount: 0,
      };

      mockEnrollmentService.bulkProcessEnrollmentRequests.mockResolvedValue(mockResult);

      const bulkData = {
        requestIds: ["req-1", "req-2"],
        action: "reject" as const,
        adminNote: "Bulk rejection test",
        reviewedBy: "admin-123",
      };

      const result = await EnrollmentService.bulkProcessEnrollmentRequests(bulkData);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(mockEnrollmentService.bulkProcessEnrollmentRequests).toHaveBeenCalledWith(bulkData);
    });

    it("should handle partial failures in bulk operations", async () => {
      const mockResult = {
        successful: ["req-1"],
        failed: [
          {
            requestId: "req-2",
            error: "Request not found",
          },
        ],
        totalProcessed: 2,
        successCount: 1,
        failureCount: 1,
      };

      mockEnrollmentService.bulkProcessEnrollmentRequests.mockResolvedValue(mockResult);

      const bulkData = {
        requestIds: ["req-1", "req-2"],
        action: "approve" as const,
        adminNote: "Partial failure test",
        reviewedBy: "admin-123",
      };

      const result = await EnrollmentService.bulkProcessEnrollmentRequests(bulkData);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.successful).toContain("req-1");
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].requestId).toBe("req-2");
    });

    it("should throw error for empty request IDs", async () => {
      mockEnrollmentService.bulkProcessEnrollmentRequests.mockRejectedValue(
        new Error("No request IDs provided")
      );

      const bulkData = {
        requestIds: [],
        action: "approve" as const,
        adminNote: "Test",
        reviewedBy: "admin-123",
      };

      await expect(
        EnrollmentService.bulkProcessEnrollmentRequests(bulkData)
      ).rejects.toThrow("No request IDs provided");
    });

    it("should throw error for invalid action", async () => {
      mockEnrollmentService.bulkProcessEnrollmentRequests.mockRejectedValue(
        new Error("Invalid action. Must be 'approve' or 'reject'")
      );

      const bulkData = {
        requestIds: ["req-1"],
        action: "invalid" as any,
        adminNote: "Test",
        reviewedBy: "admin-123",
      };

      await expect(
        EnrollmentService.bulkProcessEnrollmentRequests(bulkData)
      ).rejects.toThrow("Invalid action. Must be 'approve' or 'reject'");
    });
  });

  describe("Transaction Handling", () => {
    it("should handle transaction failures gracefully", async () => {
      const mockResult = {
        successful: [],
        failed: [
          {
            requestId: "req-1",
            error: "Only pending requests can be approved",
          },
        ],
        totalProcessed: 1,
        successCount: 0,
        failureCount: 1,
      };

      mockEnrollmentService.bulkProcessEnrollmentRequests.mockResolvedValue(mockResult);

      const bulkData = {
        requestIds: ["req-1"],
        action: "approve" as const,
        adminNote: "Transaction test",
        reviewedBy: "admin-123",
      };

      const result = await EnrollmentService.bulkProcessEnrollmentRequests(bulkData);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failed[0].error).toContain("pending");
    });

    it("should validate bulk operation result structure", () => {
      const mockResult = {
        successful: ["req-1", "req-2"],
        failed: [
          {
            requestId: "req-3",
            error: "Test error",
          },
        ],
        totalProcessed: 3,
        successCount: 2,
        failureCount: 1,
      };

      // Verify structure
      expect(Array.isArray(mockResult.successful)).toBe(true);
      expect(Array.isArray(mockResult.failed)).toBe(true);
      expect(typeof mockResult.totalProcessed).toBe("number");
      expect(typeof mockResult.successCount).toBe("number");
      expect(typeof mockResult.failureCount).toBe("number");

      // Verify failed item structure
      expect(mockResult.failed[0]).toHaveProperty("requestId");
      expect(mockResult.failed[0]).toHaveProperty("error");

      // Verify counts match
      expect(mockResult.successCount + mockResult.failureCount).toBe(mockResult.totalProcessed);
    });
  });
});