import { DocumentMetadataService } from './src/services/document-metadata.service';
import path from 'path';
import fs from 'fs/promises';

async function testMetadataExtraction() {
  console.log('🧪 Starting metadata extraction test...');
  
  const service = new DocumentMetadataService();
  
  // Create sample test files to test with
  try {
    // Create a simple PDF test file
    console.log('\n📝 Creating test PDF file...');
    const testPdfPath = path.join(__dirname, 'test-sample.pdf');
    
    // Create a simple PDF with some metadata using pdfkit
    const PDFDocument = require('pdfkit');
    const pdf = new PDFDocument({
      info: {
        Title: 'Test Document',
        Author: 'Test Author',
        Subject: 'Test Subject',
        Keywords: 'test, document, metadata',
        CreationDate: new Date(),
      }
    });
    
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      fs.writeFile(testPdfPath, pdfBuffer)
        .then(() => console.log('✅ Test PDF created'))
        .catch(console.error);
    });
    
    pdf.font('Helvetica').fontSize(12);
    pdf.text('This is a test PDF document with metadata.', 100, 100);
    pdf.text('It contains some sample text to test word and character counts.', 100, 120);
    pdf.end();
    
    // Wait a bit for the file to be written
    setTimeout(async () => {
      try {
        console.log('\n🔍 Extracting metadata from test PDF...');
        const pdfMetadata = await service.extractMetadata(testPdfPath);
        console.log('📋 PDF Metadata result:', JSON.stringify(pdfMetadata, null, 2));
      } catch (error) {
        console.error('❌ Error extracting PDF metadata:', error);
      }
      
      // Create a simple DOCX test file if needed
      console.log('\n📝 Creating test DOCX file...');
      const testDocxPath = path.join(__dirname, 'test-sample.docx');
      
      // For now, we'll just copy a sample docx if one exists
      try {
        // Check if there's an existing docx file in uploads to test with
        const uploadsPath = path.join(__dirname, 'apps', 'backend', 'uploads');
        const files = await fs.readdir(uploadsPath);
        const docxFiles = files.filter(f => f.toLowerCase().endsWith('.docx'));
        
        if (docxFiles.length > 0) {
          const sampleDocx = path.join(uploadsPath, docxFiles[0]);
          console.log(`\n🔍 Extracting metadata from existing DOCX: ${docxFiles[0]}`);
          const docxMetadata = await service.extractMetadata(sampleDocx);
          console.log('📋 DOCX Metadata result:', JSON.stringify(docxMetadata, null, 2));
        } else {
          console.log('⚠️ No existing DOCX files found in uploads for testing');
        }
      } catch (error) {
        console.log('⚠️ Could not find existing DOCX files for testing');
        console.error('Error:', error);
      }
      
      // Also try with a PDF if one exists in uploads
      try {
        const uploadsPath = path.join(__dirname, 'apps', 'backend', 'uploads');
        const files = await fs.readdir(uploadsPath);
        const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
        
        if (pdfFiles.length > 0) {
          const samplePdf = path.join(uploadsPath, pdfFiles[0]);
          console.log(`\n🔍 Extracting metadata from existing PDF: ${pdfFiles[0]}`);
          const pdfMetadata = await service.extractMetadata(samplePdf);
          console.log('📋 Existing PDF Metadata result:', JSON.stringify(pdfMetadata, null, 2));
        } else {
          console.log('⚠️ No existing PDF files found in uploads for testing');
        }
      } catch (error) {
        console.log('⚠️ Could not find existing PDF files for testing');
        console.error('Error:', error);
      }
    }, 1000); // Wait 1 second for PDF to be created
    
  } catch (error) {
    console.error('❌ Error during test setup:', error);
  }
}

testMetadataExtraction().catch(console.error);