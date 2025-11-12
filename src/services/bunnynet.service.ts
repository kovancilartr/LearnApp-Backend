import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import { bunnyNetConfig } from '../config/storage';

export interface BunnyNetUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  cdnUrl?: string;
}

export interface BunnyNetFileInfo {
  ObjectName: string;
  StorageZoneName: string;
  Path: string;
  ObjectType: string;
  Length: number;
  LastChanged: string;
  ServerId: number;
  ArrayNumber: number;
  IsDirectory: boolean;
  UserId: string;
  ContentType: string;
  DateCreated: string;
  StorageZoneId: number;
  Checksum: string;
  ReplicatedZones: string;
}

export class BunnyNetService {
  private client: AxiosInstance | null = null;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = Boolean(bunnyNetConfig.enabled && 
                     bunnyNetConfig.storageZone && 
                     bunnyNetConfig.storagePassword);

    if (this.isEnabled) {
      this.client = axios.create({
        baseURL: bunnyNetConfig.storageApiUrl,
        headers: {
          'AccessKey': bunnyNetConfig.storagePassword,
          'Content-Type': 'application/octet-stream',
        },
        timeout: 30000, // 30 seconds timeout
      });
    }
  }

  // Check if BunnyNet is enabled and configured
  isConfigured(): boolean {
    return this.isEnabled;
  }

  // Upload file to BunnyNet storage
  async uploadFile(
    localFilePath: string, 
    remoteFileName: string, 
    category: string = ''
  ): Promise<BunnyNetUploadResult> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'BunnyNet is not enabled or configured',
      };
    }

    try {
      // Read file from local storage
      if (!fs.existsSync(localFilePath)) {
        return {
          success: false,
          error: 'Local file not found',
        };
      }

      const fileBuffer = fs.readFileSync(localFilePath);
      const remotePath = category ? `${category}/${remoteFileName}` : remoteFileName;
      const uploadUrl = `/${bunnyNetConfig.storageZone}/${remotePath}`;

      // Upload to BunnyNet with retry logic
      if (!this.client) {
        return { success: false, error: 'BunnyNet client not initialized' };
      }

      let lastError: any;
      for (let attempt = 1; attempt <= bunnyNetConfig.maxRetries; attempt++) {
        try {
          const response = await this.client.put(uploadUrl, fileBuffer, {
            headers: {
              'Content-Type': 'application/octet-stream',
            },
          });

          if (response.status === 201) {
            const cdnUrl = `${bunnyNetConfig.pullZoneUrl}/${remotePath}`;
            return {
              success: true,
              url: uploadUrl,
              cdnUrl,
            };
          }
        } catch (error: any) {
          lastError = error;
          console.warn(`BunnyNet upload attempt ${attempt} failed:`, error.message);
          
          if (attempt < bunnyNetConfig.maxRetries) {
            await this.delay(bunnyNetConfig.retryDelay * attempt);
          }
        }
      }

      return {
        success: false,
        error: `Upload failed after ${bunnyNetConfig.maxRetries} attempts: ${lastError?.message}`,
      };

    } catch (error: any) {
      console.error('BunnyNet upload error:', error);
      return {
        success: false,
        error: error.message || 'Unknown upload error',
      };
    }
  }

  // Delete file from BunnyNet storage
  async deleteFile(remoteFileName: string, category: string = ''): Promise<BunnyNetUploadResult> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'BunnyNet is not enabled or configured',
      };
    }

    try {
      const remotePath = category ? `${category}/${remoteFileName}` : remoteFileName;
      const deleteUrl = `/${bunnyNetConfig.storageZone}/${remotePath}`;

      if (!this.client) {
        return { success: false, error: 'BunnyNet client not initialized' };
      }

      const response = await this.client.delete(deleteUrl);

      if (response.status === 200) {
        return {
          success: true,
        };
      }

      return {
        success: false,
        error: `Delete failed with status: ${response.status}`,
      };

    } catch (error: any) {
      console.error('BunnyNet delete error:', error);
      return {
        success: false,
        error: error.message || 'Unknown delete error',
      };
    }
  }

  // List files in BunnyNet storage
  async listFiles(directory: string = ''): Promise<BunnyNetFileInfo[]> {
    if (!this.isEnabled) {
      throw new Error('BunnyNet is not enabled or configured');
    }

    try {
      if (!this.client) {
        throw new Error('BunnyNet client not initialized');
      }

      const listUrl = `/${bunnyNetConfig.storageZone}/${directory}`;
      const response = await this.client.get(listUrl);

      if (response.status === 200) {
        return response.data as BunnyNetFileInfo[];
      }

      throw new Error(`List failed with status: ${response.status}`);

    } catch (error: any) {
      console.error('BunnyNet list error:', error);
      throw new Error(error.message || 'Unknown list error');
    }
  }

  // Get file info from BunnyNet
  async getFileInfo(remoteFileName: string, category: string = ''): Promise<BunnyNetFileInfo | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const files = await this.listFiles(category);
      return files.find(file => file.ObjectName === remoteFileName) || null;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  // Generate CDN URL for a file
  generateCdnUrl(remoteFileName: string, category: string = ''): string {
    if (!this.isEnabled || !bunnyNetConfig.pullZoneUrl) {
      return '';
    }

    const remotePath = category ? `${category}/${remoteFileName}` : remoteFileName;
    return `${bunnyNetConfig.pullZoneUrl}/${remotePath}`;
  }

  // Sync local file to BunnyNet (upload if not exists or if local is newer)
  async syncFile(
    localFilePath: string, 
    remoteFileName: string, 
    category: string = ''
  ): Promise<BunnyNetUploadResult> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'BunnyNet is not enabled or configured',
      };
    }

    try {
      // Check if local file exists
      if (!fs.existsSync(localFilePath)) {
        return {
          success: false,
          error: 'Local file not found',
        };
      }

      // Get local file stats
      const localStats = fs.statSync(localFilePath);
      
      // Check if file exists on BunnyNet
      const remoteFileInfo = await this.getFileInfo(remoteFileName, category);
      
      // Upload if remote file doesn't exist or local file is newer
      if (!remoteFileInfo || new Date(localStats.mtime) > new Date(remoteFileInfo.LastChanged)) {
        return await this.uploadFile(localFilePath, remoteFileName, category);
      }

      // File is already up to date
      return {
        success: true,
        cdnUrl: this.generateCdnUrl(remoteFileName, category),
      };

    } catch (error: any) {
      console.error('BunnyNet sync error:', error);
      return {
        success: false,
        error: error.message || 'Unknown sync error',
      };
    }
  }

  // Bulk upload files to BunnyNet
  async bulkUpload(
    files: Array<{ localPath: string; remoteName: string; category?: string }>
  ): Promise<Array<BunnyNetUploadResult & { fileName: string }>> {
    const results: Array<BunnyNetUploadResult & { fileName: string }> = [];

    for (const file of files) {
      const result = await this.uploadFile(file.localPath, file.remoteName, file.category);
      results.push({
        ...result,
        fileName: file.remoteName,
      });

      // Small delay between uploads to avoid rate limiting
      await this.delay(100);
    }

    return results;
  }

  // Test BunnyNet connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'BunnyNet is not enabled or configured',
      };
    }

    try {
      // Try to list files in root directory
      await this.listFiles();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }

  // Get storage usage statistics
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    categories: Record<string, { files: number; size: number }>;
  }> {
    if (!this.isEnabled) {
      throw new Error('BunnyNet is not enabled or configured');
    }

    try {
      const allFiles = await this.listFiles();
      const categories = ['images', 'videos', 'pdfs', 'temp'];
      const stats = {
        totalFiles: allFiles.length,
        totalSize: allFiles.reduce((sum, file) => sum + file.Length, 0),
        categories: {} as Record<string, { files: number; size: number }>,
      };

      // Calculate stats by category
      for (const category of categories) {
        const categoryFiles = await this.listFiles(category);
        stats.categories[category] = {
          files: categoryFiles.length,
          size: categoryFiles.reduce((sum, file) => sum + file.Length, 0),
        };
      }

      return stats;
    } catch (error: any) {
      console.error('Error getting storage stats:', error);
      throw new Error(error.message || 'Failed to get storage stats');
    }
  }

  // Utility method for delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up old files from BunnyNet (older than specified days)
  async cleanupOldFiles(category: string, olderThanDays: number): Promise<{
    deletedFiles: string[];
    errors: string[];
  }> {
    if (!this.isEnabled) {
      throw new Error('BunnyNet is not enabled or configured');
    }

    const deletedFiles: string[] = [];
    const errors: string[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const files = await this.listFiles(category);
      
      for (const file of files) {
        if (new Date(file.LastChanged) < cutoffDate) {
          const deleteResult = await this.deleteFile(file.ObjectName, category);
          if (deleteResult.success) {
            deletedFiles.push(file.ObjectName);
          } else {
            errors.push(`Failed to delete ${file.ObjectName}: ${deleteResult.error}`);
          }
          
          // Small delay between deletions
          await this.delay(100);
        }
      }

      return { deletedFiles, errors };
    } catch (error: any) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }
}

export const bunnyNetService = new BunnyNetService();