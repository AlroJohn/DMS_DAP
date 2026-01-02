# Document Release and Cancel Functionality Implementation Test

## Overview
This document verifies the implementation of the functionality where once a document is released in "intransit" status, the release button is disabled and a cancel button appears to cancel the intransit status. When canceled, the document status should go back to "dispatch".

## Implementation Summary

### Backend Changes
1. Added `cancelIntransitDocument` method to `IntransitService`:
   - Validates document ID format
   - Checks if document exists and is in 'intransit' status
   - Verifies that the requesting department is the one that released the document
   - Updates document status from 'intransit' back to 'dispatch'
   - Creates a document trail entry for the cancellation
   - Emits socket events for real-time updates

2. Added `cancelIntransitDocument` controller method to `IntransitController`:
   - Handles the API request with proper authentication
   - Extracts document ID from request parameters
   - Calls the service method to perform cancellation

3. Added route in `intransit.routes.ts`:
   - POST `/api/intransit/:id/cancel` endpoint to cancel an in-transit document

### Frontend Changes
1. Updated `DataTableRowActions` component in `data-table-row-action.tsx`:
   - Added logic to detect when a document is in 'intransit' status
   - Modified `handleCancel` function to use the appropriate endpoint:
     - `/api/intransit/:id/cancel` for in-transit documents (reverts to dispatch)
     - `/api/documents/:id/cancel` for other statuses
   - Added `isAlreadyReleased` check to prevent showing release button when document is already in-transit
   - Updated conditions: `showRelease = canRelease && !isAlreadyReleased`

## Testing Scenarios

### Scenario 1: Document Release
1. User selects a document with "dispatch" status
2. "Release" button should be visible and enabled
3. On clicking "Release", the `ReleaseDocumentModal` opens
4. After successful release, document status becomes "intransit"
5. The "Release" button should now be hidden
6. The "Cancel" button should appear
7. Expected Result: Document status changes to "intransit", release button disappears, cancel button appears

### Scenario 2: Document Cancel (in-transit)
1. User selects a document with "intransit" status
2. "Cancel" button should be visible and enabled
3. On clicking "Cancel", the document status should revert to "dispatch"
4. The "Release" button should now appear again
5. The "Cancel" button should disappear (since status is no longer in-transit)
6. Expected Result: Document status changes back to "dispatch", cancel button disappears, release button appears again

### Scenario 3: Non-in-transit Document Cancel
1. User selects a document with status other than "intransit" (e.g., "received")
2. "Cancel" button behavior should remain unchanged (use existing endpoint)
3. Expected Result: Uses the original cancel endpoint for non-in-transit documents

### Scenario 4: Permission Checks
1. Verify that only authorized users can perform release/cancel operations
2. Verify that only the department that released a document can cancel it (in the in-transit case)
3. Expected Result: Proper permission checks maintained from existing implementation

## Technical Implementation Details

### Backend Service Method
```typescript
async cancelIntransitDocument(documentId: string, userId: string) {
  // Validation and authentication
  // Check document exists and is in 'intransit' status
  // Verify user's department released this document
  // Update status to 'dispatch'
  // Create document trail
  // Emit real-time updates
}
```

### Frontend Integration
```typescript
const handleCancel = async () => {
  const isDocumentInTransit = document.status?.toLowerCase().includes("intransit") || 
                             document.status?.toLowerCase().includes("transit") ||
                             document.status?.toLowerCase().includes("outgoing");
  
  if (isDocumentInTransit) {
    // Use intransit cancel endpoint
  } else {
    // Use regular cancel endpoint
  }
};
```

## Expected Outcomes

1. After a document is released to "intransit" status:
   - The release button is disabled/hidden
   - A cancel button becomes visible
   - The document cannot be released again to another department until canceled

2. When the in-transit document is canceled:
   - Status reverts from "intransit" to "dispatch"
   - The cancel button disappears
   - The release button becomes available again
   - Document trail is created to track the status change

3. Other functionality remains unchanged:
   - Regular document cancellation still works for non-in-transit documents
   - All permission checks are maintained
   - Real-time updates propagate through the system