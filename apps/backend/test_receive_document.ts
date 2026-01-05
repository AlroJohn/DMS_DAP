import { prisma } from './src/lib/prisma';
import { DocumentReleaseService } from './src/services/document-release.service';

// Test script to verify the receiveDocument functionality
async function testReceiveDocument() {
  console.log('Testing receiveDocument functionality...');

  try {
    // Create an instance of the service
    const documentReleaseService = new DocumentReleaseService();

    // Sample data for testing
    const documentId = 'test-document-id'; // This should be an actual document ID in your database
    const userId = 'test-user-id'; // This should be an actual user ID in your database

    console.log(`Attempting to receive document ${documentId} by user ${userId}`);

    // Call the receiveDocument function
    const result = await documentReleaseService.receiveDocument(documentId, userId);

    console.log('Result:', result);

    if (result.success) {
      console.log('✅ Document received successfully!');

      // Verify the document additional details were updated
      const documentDetails = await prisma.documentAdditionalDetails.findFirst({
        where: {
          document_id: documentId
        }
      });

      if (documentDetails && documentDetails.received_by_department_user) {
        console.log('✅ DocumentAdditionalDetails updated successfully');
        console.log('received_by_department_user:', documentDetails.received_by_department_user);
        
        // Parse the JSON to check if the user ID was added
        let receivedByUsers: string[] = [];
        if (Array.isArray(documentDetails.received_by_department_user)) {
          receivedByUsers = documentDetails.received_by_department_user as string[];
        } else if (typeof documentDetails.received_by_department_user === 'string') {
          receivedByUsers = JSON.parse(documentDetails.received_by_department_user);
        }
        
        if (receivedByUsers.includes(userId)) {
          console.log(`✅ User ID ${userId} found in received_by_department_user array`);
        } else {
          console.log(`❌ User ID ${userId} NOT found in received_by_department_user array`);
        }
      } else {
        console.log('❌ DocumentAdditionalDetails not found or not updated properly');
      }
    } else {
      console.log('❌ Document receive failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testReceiveDocument().then(() => {
  console.log('Test completed');
}).catch((error) => {
  console.error('Test failed:', error);
});