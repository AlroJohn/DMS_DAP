# Document Management Features

This document outlines the key features related to document creation and management in the system.

## 1. Document Creation via UI

Users can create new documents and upload associated files through the user interface.

### Flow:
1.  Navigate to the "Documents" page.
2.  Click the "Document" button in the toolbar to open the upload modal.
3.  Fill in the required document details:
    -   **Title**: The name of the document.
    -   **Description**: A brief summary of the document's content.
    -   **Document Type**: The category of the document (e.g., Report, Invoice).
    -   **Classification**: The sensitivity level (e.g., Simple, Complex).
4.  Select one or more files to upload. The system supports various file types, including PDF, DOCX, XLSX, PPTX, images, and more.
5.  Click "Upload Documents".

### Backend Process:
-   The frontend sends a single `multipart/form-data` request to the `POST /api/documents/upload` endpoint.
-   The backend's `createDocumentWithFile` service method is invoked.
-   A new `Document` record is created in the database.
-   The uploaded file is saved to the server's file system.
-   The `DocumentMetadataService` is called to extract metadata from the uploaded file. This includes:
    -   **PDFs**: Page count, author, title, subject, keywords, etc.
    -   **Office Documents**: Author, title, word count, page count, etc.
    -   **Images/Other**: Basic file properties and EXIF data where available.
-   The extracted metadata is saved in the `DocumentMetadata` table, linked to the document file.
-   A real-time event is emitted via Socket.IO to notify connected clients of the new document.

## 2. Bulk Ingestion via Directory Scanning

The system supports bulk ingestion of documents by scanning a directory on the server.

### API Endpoint:
-   **URL**: `/api/documents/scan`
-   **Method**: `POST`
-   **Body**: 
    ```json
    {
      "directoryPath": "/path/to/your/documents"
    }
    ```

### Flow:
1.  An administrator or an automated process sends a POST request to the `/api/documents/scan` endpoint with the path to a directory.
2.  The backend's `scanDocuments` service method is invoked.
3.  The service recursively scans the specified directory for files.
4.  For each file found, it automatically:
    -   Creates a new `Document` record, using the filename as the title.
    -   Calls the `DocumentMetadataService` to extract and save metadata, just like a manual upload.
5.  The API returns a summary of the documents that were successfully created.

This feature is useful for migrating large batches of existing documents into the system.
