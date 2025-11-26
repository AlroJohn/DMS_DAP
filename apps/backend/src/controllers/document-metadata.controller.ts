import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

// store uploads in memory; switch to disk if files are large
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const extractMetadata = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = (path.extname(req.file.originalname) || '').toLowerCase();

    if (ext === '.pdf') {
      const meta = await extractPdfMeta(req.file.buffer);
      return res.json({ type: 'pdf', metadata: meta });
    }

    if (ext === '.docx') {
      const meta = await extractDocxMeta(req.file.buffer);
      return res.json({ type: 'docx', metadata: meta });
    }

    return res.status(415).json({ error: 'Unsupported file type. Use .pdf or .docx' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to parse metadata', details: err?.message });
  }
};

/** ---------- Helpers ---------- **/

async function extractPdfMeta(buffer: Buffer) {
  const data = await (pdf as any)(buffer);

  // data.info: common PDF info dictionary
  // data.metadata: XMP metadata (if present), already parsed by pdf-parse/PDF.js
  const info = data.info || {};
  const xmp = data.metadata ? data.metadata.metadata : undefined; // may be undefined

  return {
    // Common fields
    Title: info.Title ?? null,
    Author: info.Author ?? null,
    Subject: info.Subject ?? null,
    Keywords: info.Keywords ?? null,
    Creator: info.Creator ?? null,   // app that created the content
    Producer: info.Producer ?? null, // PDF generator (e.g., Acrobat, wkhtmltopdf)
    CreationDate: normalizePdfDate(info.CreationDate),
    ModDate: normalizePdfDate(info.ModDate),
    Pages: data.numpages,
    // Raw objects in case you need everything
    rawInfo: info,
    xmp, // may contain richer Dublin Core / XMP fields
  };
}

function normalizePdfDate(d?: string) {
  // PDF dates look like D:YYYYMMDDHHmmSS+TZ
  if (!d || typeof d !== 'string') return null;
  // Basic cleanup; you can improve this to fully follow the PDF spec
  const match = d.match(/\d{4}/) ? d.replace(/^D:/, '') : null;
  return match || d;
}

async function extractDocxMeta(buffer: Buffer) {
  // DOCX is a zip. Metadata lives in:
  // - docProps/core.xml (core properties)
  // - docProps/app.xml (application details)
  // - docProps/custom.xml (custom properties)
  const zip = await JSZip.loadAsync(buffer);
  const parser = new XMLParser({ ignoreAttributes: false });

  const readXml = async (filePath: string) => {
    const file = zip.file(filePath);
    if (!file) return null;
    const xml = await file.async('text');
    return parser.parse(xml);
  };

  const core = await readXml('docProps/core.xml');     // dc:title, dc:creator, cp:lastModifiedBy, dcterms:created, dcterms:modified, etc.
  const app = await readXml('docProps/app.xml');       // Application, Pages, Words, Lines, Characters, etc. (varies by producer)
  const custom = await readXml('docProps/custom.xml'); // Custom properties

  // Core fields live under namespaces; normalize best-effort:
  const coreProps: { [key: string]: any } =
    core?.['cp:coreProperties'] || core?.coreProperties || core || {};
  const created = coreProps['dcterms:created']?.['#text'] || coreProps['dcterms:created'];
  const modified = coreProps['dcterms:modified']?.['#text'] || coreProps['dcterms:modified'];

  const metadata: any = {
    // Core
    title: coreProps['dc:title'] ?? null,
    subject: coreProps['dc:subject'] ?? null,
    creator: coreProps['dc:creator'] ?? null,          // author
    description: coreProps['dc:description'] ?? null,
    keywords: coreProps['cp:keywords'] ?? null,
    lastModifiedBy: coreProps['cp:lastModifiedBy'] ?? null,
    revision: coreProps['cp:revision'] ?? null,
    created: created ?? null,
    modified: modified ?? null,

    // App (optional / producer-dependent)
    application: app?.Properties?.Application ?? null,
    docSecurity: app?.Properties?.DocSecurity ?? null,
    pages: app?.Properties?.Pages ?? null,
    words: app?.Properties?.Words ?? null,

    // Custom properties (array of property entries)
    customProperties: [],
    raw: { core, app, custom }, // keep raw in case you want to dig further
  };

  // Parse custom properties to a simple array: [{ name, type, value }]
  if (custom?.Properties?.property) {
    const props = Array.isArray(custom.Properties.property)
      ? custom.Properties.property
      : [custom.Properties.property];

    metadata.customProperties = props.map((p: any) => {
      const name = p[' @_name'] ?? null;
      // Custom property value is one child with a type tag (e.g., vt:lpwstr, vt:i4, vt:bool)
      const entries = Object.entries(p).filter(([k]) => !k.startsWith(' @'));
      let type = null, value = null;
      if (entries.length) {
        type = entries[0][0];      // e.g., 'vt:lpwstr'
        value = ((entries[0][1] as any)?.['#text'] ?? entries[0][1]) ?? null;
      }
      return { name, type, value };
    });
  }

  return metadata;
}

export { upload };