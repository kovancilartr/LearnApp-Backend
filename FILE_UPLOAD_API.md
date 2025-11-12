# File Upload API Documentation

## Overview

The LearnApp File Upload API provides comprehensive file management capabilities including:

- **Direct file uploads** with progress tracking
- **File access authorization** with role-based permissions
- **File deletion and cleanup** operations
- **File metadata retrieval** with detailed information
- **Bulk file operations** for efficient management
- **Advanced file search** with multiple filters

## Features

### 1. Progress Tracking
- Real-time upload progress monitoring
- Estimated time remaining calculations
- Upload status tracking (pending, in_progress, completed, failed)

### 2. File Access Authorization
- Role-based access control (Admin, Teacher, Student, Parent)
- File ownership validation
- Teacher access to student files
- Parent access to children's files

### 3. Bulk Operations
- Bulk file deletion (up to 50 files)
- Bulk file category movement
- Batch operation results with success/failure details

### 4. Advanced Search
- Text search in filenames
- Filter by MIME type, category, date range, file size
- Pagination support
- Admin-only cross-user search

### 5. File Management
- Detailed file metadata with system information
- File existence validation
- CDN integration support
- Automatic cleanup of orphaned files

## API Endpoints

### Upload Operations

#### Single File Upload
```http
POST /api/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: <binary file data>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "generated-filename.pdf",
    "originalName": "document.pdf",
    "mimeType": "application/pdf",
    "size": 1024000,
    "url": "http://localhost:3001/api/files/pdfs/generated-filename.pdf",
    "uploadId": "upload-uuid",
    "createdAt": "2025-01-07T10:00:00Z"
  }
}
```

#### Multiple File Upload
```http
POST /api/files/upload-multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- files: <binary file data 1>
- files: <binary file data 2>
```

#### Upload Progress Tracking
```http
GET /api/files/progress/{uploadId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "uuid",
    "progress": 75,
    "status": "in_progress",
    "totalSize": 1024000,
    "uploadedSize": 768000,
    "startedAt": "2025-01-07T10:00:00Z",
    "estimatedTimeRemaining": 30
  }
}
```

### File Management

#### Get Detailed File Metadata
```http
GET /api/files/detailed/{fileId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "file.pdf",
    "originalName": "document.pdf",
    "mimeType": "application/pdf",
    "size": 1024000,
    "sizeFormatted": "1.00 MB",
    "category": "pdfs",
    "uploader": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT"
    },
    "fileExists": true,
    "lastModified": "2025-01-07T10:00:00Z",
    "isPublic": false,
    "downloadCount": 5,
    "tags": []
  }
}
```

#### Advanced File Search
```http
GET /api/files/search?q=document&mimeType=application/pdf&page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `q`: Search query for filename
- `mimeType`: Filter by MIME type
- `category`: Filter by category (pdfs, images, videos, temp)
- `dateFrom`: Filter files created after date (YYYY-MM-DD)
- `dateTo`: Filter files created before date (YYYY-MM-DD)
- `minSize`: Minimum file size in bytes
- `maxSize`: Maximum file size in bytes
- `uploadedBy`: Filter by uploader (admin only)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10, max: 100)

#### File Access
```http
GET /api/files/{category}/{filename}
Authorization: Bearer <token>
```

Categories: `pdfs`, `images`, `videos`, `temp`

### Bulk Operations

#### Bulk Delete Files
```http
POST /api/files/bulk/delete
Content-Type: application/json
Authorization: Bearer <token>

{
  "fileIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": ["uuid1", "uuid2"],
    "failed": [
      {
        "id": "uuid3",
        "error": "Access denied"
      }
    ],
    "summary": {
      "total": 3,
      "successful": 2,
      "failed": 1
    }
  }
}
```

#### Bulk Move Files
```http
POST /api/files/bulk/move
Content-Type: application/json
Authorization: Bearer <token>

{
  "fileIds": ["uuid1", "uuid2"],
  "targetCategory": "images"
}
```

### File Deletion

#### Delete Single File
```http
DELETE /api/files/{fileId}
Authorization: Bearer <token>
```

## File Types and Limits

### Supported File Types
- **PDFs**: `application/pdf`
- **Images**: `image/jpeg`, `image/png`, `image/gif`
- **Videos**: `video/mp4`, `video/webm`

### File Size Limits
- Maximum file size: 10MB per file
- Maximum files per upload: 5 files
- Bulk operations: Up to 50 files

### Rate Limits
- File uploads: 20 uploads per 15 minutes per user
- General API: 100 requests per 15 minutes per IP

## Security Features

### Access Control
- **File Owners**: Full access to their files
- **Admins**: Access to all files
- **Teachers**: Access to files uploaded by their students
- **Parents**: Access to files uploaded by their children

### File Validation
- MIME type validation
- File extension validation
- Filename length limits (255 characters)
- Prohibited filename validation
- Dangerous character filtering

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Cache-Control: private, max-age=3600`

## Error Handling

### Common Error Codes
- `NO_FILE`: No file uploaded
- `UNAUTHORIZED`: User not authenticated
- `ACCESS_DENIED`: Insufficient permissions
- `FILE_NOT_FOUND`: File does not exist
- `UPLOAD_ERROR`: File upload failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_INPUT`: Invalid request parameters

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)"
  },
  "timestamp": "2025-01-07T10:00:00Z"
}
```

## Usage Examples

### JavaScript/TypeScript Client

```typescript
// Upload single file with progress tracking
async function uploadFile(file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const result = await response.json();
  
  if (result.success) {
    // Track upload progress
    const uploadId = result.data.uploadId;
    trackUploadProgress(uploadId, token);
  }
  
  return result;
}

// Track upload progress
async function trackUploadProgress(uploadId: string, token: string) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/files/progress/${uploadId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const progress = await response.json();
    
    if (progress.success) {
      console.log(`Upload progress: ${progress.data.progress}%`);
      
      if (progress.data.status === 'completed') {
        clearInterval(interval);
        console.log('Upload completed!');
      }
    }
  }, 1000);
}

// Search files
async function searchFiles(query: string, token: string) {
  const params = new URLSearchParams({
    q: query,
    mimeType: 'application/pdf',
    page: '1',
    limit: '10'
  });

  const response = await fetch(`/api/files/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}

// Bulk delete files
async function bulkDeleteFiles(fileIds: string[], token: string) {
  const response = await fetch('/api/files/bulk/delete', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileIds })
  });

  return response.json();
}
```

### cURL Examples

```bash
# Upload file
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  http://localhost:3001/api/files/upload

# Search files
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/files/search?q=document&mimeType=application/pdf"

# Bulk delete
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileIds":["uuid1","uuid2"]}' \
  http://localhost:3001/api/files/bulk/delete
```

## CDN Integration

The API supports optional CDN integration with BunnyNet:

- Automatic file sync to CDN after upload
- CDN URL fallback for file access
- Manual sync endpoints for existing files
- CDN statistics and health monitoring

## Monitoring and Analytics

### File Statistics
- Total files and storage usage
- Files by type breakdown
- User-specific statistics
- CDN sync status

### Admin Operations
- Cleanup orphaned files
- Cleanup temporary files
- Storage usage monitoring
- CDN management

## Best Practices

1. **Always validate file types** on the client side before upload
2. **Implement progress tracking** for better user experience
3. **Use bulk operations** for multiple file management
4. **Handle rate limits** gracefully with retry logic
5. **Validate file access** before displaying file links
6. **Clean up temporary files** regularly
7. **Monitor storage usage** to prevent disk space issues

## Troubleshooting

### Common Issues

1. **Upload fails with 413 error**: File too large (>10MB)
2. **Upload fails with 400 error**: Invalid file type or format
3. **403 error on file access**: User doesn't have permission
4. **429 error**: Rate limit exceeded, wait before retrying
5. **Progress tracking not working**: Upload ID not found or expired

### Debug Tips

1. Check file size and type before upload
2. Verify authentication token is valid
3. Ensure proper Content-Type headers
4. Check server logs for detailed error messages
5. Validate file permissions and access rights