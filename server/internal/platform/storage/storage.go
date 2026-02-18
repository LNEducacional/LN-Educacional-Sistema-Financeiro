package storage

import (
	"errors"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

var (
	ErrInvalidMimeType = errors.New("invalid file type")
	ErrFileTooLarge    = errors.New("file exceeds maximum size")
)

var AllowedMimeTypes = map[string]bool{
	"application/pdf": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
	"application/zip": true,
	"application/x-zip-compressed": true,
}

const (
	MaxFileSize = 10 * 1024 * 1024 // 10MB
	UploadDir   = "./uploads"
)

type FileInfo struct {
	Path         string
	OriginalName string
	MimeType     string
	Size         int64
}

// SaveFile saves an uploaded file to the uploads directory
// Returns file path, original name, mime type, size, and error
func SaveFile(file multipart.File, header *multipart.FileHeader) (*FileInfo, error) {
	// Check file size
	if header.Size > MaxFileSize {
		return nil, ErrFileTooLarge
	}

	// Get content type
	contentType := header.Header.Get("Content-Type")
	if !AllowedMimeTypes[contentType] {
		return nil, ErrInvalidMimeType
	}

	// Ensure upload directory exists
	if err := os.MkdirAll(UploadDir, 0755); err != nil {
		return nil, err
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	newFilename := uuid.New().String() + ext
	filePath := filepath.Join(UploadDir, newFilename)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	// Copy file content
	written, err := io.Copy(dst, file)
	if err != nil {
		os.Remove(filePath) // Clean up on error
		return nil, err
	}

	return &FileInfo{
		Path:         filePath,
		OriginalName: header.Filename,
		MimeType:     contentType,
		Size:         written,
	}, nil
}
