import { createHash } from 'crypto';

// Vendor-neutral file metadata interface
export interface FileMetadata {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum: string;
  userId: string;
}

// Storage operation result
export interface StorageResult {
  success: boolean;
  fileId?: string;
  url?: string;
  error?: string;
}

// Abstract Storage Interface - vendor agnostic
export interface IFileStorage {
  upload(file: Buffer, metadata: FileMetadata): Promise<StorageResult>;
  download(fileId: string): Promise<Buffer>;
  downloadWithFallback(fileId: string, retryCount: number): Promise<Buffer>;
  delete(fileId: string): Promise<boolean>;
  generateSignedUrl(fileId: string, expiresIn: number): Promise<string>;
  listFiles(userId: string): Promise<FileMetadata[]>;
  verifyFileIntegrity(fileId: string, expectedChecksum: string): Promise<boolean>;
  createMigrationCheckpoint(userId: string): Promise<MigrationCheckpoint>;
}

// Migration checkpoint for data safety
export interface MigrationCheckpoint {
  checkpointId: string;
  userId: string;
  files: FileMetadata[];
  timestamp: Date;
  storageProvider: string;
}

// Performance monitoring integration
export class PerformanceMonitor {
  static trackFileUpload(duration: number, fileSize: number, operation: string): void {
    console.log(`[PERF] ${operation} - Duration: ${duration}ms, Size: ${fileSize} bytes`);
    
    // Alert on slow uploads (>30 seconds)
    if (duration > 30000) {
      console.warn(`[ALERT] Slow file upload detected: ${duration}ms for ${fileSize} bytes`);
    }
    
    // TODO: Send to monitoring system (Prometheus, etc.)
  }
  
  static trackDatabaseQuery(operation: string, duration: number): void {
    console.log(`[PERF] DB ${operation} - Duration: ${duration}ms`);
    
    // Alert on slow queries (>2 seconds)
    if (duration > 2000) {
      console.warn(`[ALERT] Slow database query: ${operation} took ${duration}ms`);
    }
  }
  
  static alertOnLatency(operation: string, threshold: number, actual: number): void {
    if (actual > threshold) {
      console.error(`[CRITICAL] ${operation} exceeded threshold: ${actual}ms > ${threshold}ms`);
    }
  }
}

// Health data specific error types
export class HealthDataAccessError extends Error {
  constructor(message: string, public readonly fileId?: string) {
    super(message);
    this.name = 'HealthDataAccessError';
  }
}

export class FileIntegrityError extends Error {
  constructor(message: string, public readonly fileId: string) {
    super(message);
    this.name = 'FileIntegrityError';
  }
}

// Utility functions for file validation
export class FileValidator {
  private static readonly ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png', 
    'image/tiff',
    'image/bmp',
    'image/gif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc
  ];
  
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_FILES_PER_USER = 3;
  
  static validateFileType(mimeType: string): boolean {
    return this.ALLOWED_TYPES.includes(mimeType);
  }
  
  static validateFileSize(size: number): boolean {
    return size <= this.MAX_FILE_SIZE;
  }
  
  static validateFileName(fileName: string): boolean {
    // Sanitize file name - no path traversal, special characters
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return sanitized.length > 0 && sanitized.length <= 255;
  }
  
  static generateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
  
  static validateUserFileLimit(currentCount: number): boolean {
    return currentCount < this.MAX_FILES_PER_USER;
  }
}

// Base implementation for all storage providers
export abstract class BaseFileStorage implements IFileStorage {
  protected performanceMonitor = PerformanceMonitor;
  
  abstract upload(file: Buffer, metadata: FileMetadata): Promise<StorageResult>;
  abstract download(fileId: string): Promise<Buffer>;
  abstract delete(fileId: string): Promise<boolean>;
  abstract generateSignedUrl(fileId: string, expiresIn: number): Promise<string>;
  abstract listFiles(userId: string): Promise<FileMetadata[]>;
  
  // Default implementation with retry logic
  async downloadWithFallback(fileId: string, retryCount: number = 3): Promise<Buffer> {
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const start = Date.now();
        const result = await this.download(fileId);
        const duration = Date.now() - start;
        
        this.performanceMonitor.trackFileUpload(duration, result.length, `download_attempt_${attempt}`);
        return result;
      } catch (error) {
        if (attempt === retryCount) {
          throw new HealthDataAccessError(`Failed to download file after ${retryCount} attempts: ${error}`, fileId);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw new HealthDataAccessError(`Unexpected error in downloadWithFallback`, fileId);
  }
  
  async verifyFileIntegrity(fileId: string, expectedChecksum: string): Promise<boolean> {
    try {
      const fileBuffer = await this.download(fileId);
      const actualChecksum = FileValidator.generateChecksum(fileBuffer);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      console.error(`File integrity check failed for ${fileId}:`, error);
      return false;
    }
  }
  
  abstract createMigrationCheckpoint(userId: string): Promise<MigrationCheckpoint>;
}