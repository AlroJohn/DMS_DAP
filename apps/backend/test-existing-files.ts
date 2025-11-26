import { DocumentMetadataService } from './src/services/document-metadata.service';
import path from 'path';

async function testExistingFiles() {
  console.log('🧪 Testing metadata extraction from existing files in uploads...');
  
  const service = new DocumentMetadataService();
  
  // List the PDF files we found
  const pdfFiles = [
    'document-trails (3)-1762918375027-21d7bd8d84d5.pdf',
    'document-trails-1762915085335-3d4fc7d2dc63.pdf',
    'MERCADO_ALRO_JOHN_T-1762921545666-6d58528d8f49.pdf',
    'MERCADO_ALRO_JOHN_T-1762922826810-18336bf8a981.pdf',
    'MERCADO_ALRO_JOHN_T-1762922871414-381ca2a2f4e0.pdf',
    'MERCADO_ALRO_JOHN_T-1762926136481-f56126289819.pdf',
    'MERCADO_ALRO_JOHN_T-1762927316025-776ae9a7dec1.pdf',
    'MERCADO_ALRO_JOHN_T-1762927661470-7abdf6126f60.pdf',
    'ssrn-3794522-1762919798262-8f2a282bd2b3.pdf',
    'Temu Web Document-1762915271782-1efc93dbd2fa.pdf'
  ];
  
  const docxFiles = [
    'MERCADO_ALRO_JOHN_T-1762922871414-381ca2a2f4e0.docx',
    'MERCADO_ALRO_JOHN_T-1762927340754-974441567087.docx'
  ];
  
  // Test PDF files
  console.log('\n🔍 Testing PDF files...');
  for (const fileName of pdfFiles) {
    try {
      const filePath = path.join(__dirname, 'uploads', fileName);
      console.log(`\n📄 Processing: ${fileName}`);
      
      const metadata = await service.extractMetadata(filePath);
      console.log('📋 Extracted Metadata:', JSON.stringify(metadata, null, 2));
      
      // Check for expected fields
      const expectedFields = ['word_count', 'character_count', 'language', 'subject', 'keywords', 'author', 'creator', 'producer', 'creation_date', 'modification_date', 'page_count'];
      console.log('✅ Fields present:', Object.keys(metadata).filter(field => expectedFields.includes(field)));
      
    } catch (error) {
      console.error(`❌ Error processing ${fileName}:`, error);
    }
  }
  
  // Test DOCX files
  console.log('\n🔍 Testing DOCX files...');
  for (const fileName of docxFiles) {
    try {
      const filePath = path.join(__dirname, 'uploads', fileName);
      console.log(`\n📄 Processing: ${fileName}`);
      
      const metadata = await service.extractMetadata(filePath);
      console.log('📋 Extracted Metadata:', JSON.stringify(metadata, null, 2));
      
      // Check for expected fields
      const expectedFields = ['word_count', 'character_count', 'language', 'subject', 'keywords', 'author', 'creator', 'creation_date', 'modification_date', 'page_count'];
      console.log('✅ Fields present:', Object.keys(metadata).filter(field => expectedFields.includes(field)));
      
    } catch (error) {
      console.error(`❌ Error processing ${fileName}:`, error);
    }
  }
  
  console.log('\n🎉 Test completed!');
}

testExistingFiles().catch(console.error);