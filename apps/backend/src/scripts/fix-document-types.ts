import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration script to fix document_type field in existing documents
 * Converts UUID values to document type names
 */
async function fixDocumentTypes() {
  console.log('🔧 Starting document type migration...');

  try {
    // Get all documents
    const documents = await prisma.document.findMany({
      select: {
        document_id: true,
        document_code: true,
        document_type: true,
      }
    });

    console.log(`📄 Found ${documents.length} documents to check`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const doc of documents) {
      // Check if document_type looks like a UUID (contains hyphens and is 36 chars long)
      const isUUID = doc.document_type && 
                     doc.document_type.length === 36 && 
                     doc.document_type.includes('-');

      if (isUUID) {
        try {
          // Try to find the DocumentType by type_id
          const documentType = await prisma.documentType.findUnique({
            where: { type_id: doc.document_type },
            select: { name: true }
          });

          if (documentType) {
            // Update the document with the type name
            await prisma.document.update({
              where: { document_id: doc.document_id },
              data: { document_type: documentType.name }
            });

            console.log(`✅ Fixed: ${doc.document_code} - ${doc.document_type} → ${documentType.name}`);
            fixedCount++;
          } else {
            console.log(`⚠️  Warning: No DocumentType found for ID ${doc.document_type} (Document: ${doc.document_code})`);
            
            // Set to 'General' as fallback
            await prisma.document.update({
              where: { document_id: doc.document_id },
              data: { document_type: 'General' }
            });
            
            console.log(`   Set to 'General' as fallback`);
            fixedCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing document ${doc.document_code}:`, error);
          errorCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Fixed: ${fixedCount} documents`);
    console.log(`   ⏭️  Skipped: ${skippedCount} documents (already have valid names)`);
    console.log(`   ❌ Errors: ${errorCount} documents`);
    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixDocumentTypes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
