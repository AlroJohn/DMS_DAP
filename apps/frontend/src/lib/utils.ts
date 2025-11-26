import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to extract document name and code from notification messages
export function extractDocumentInfo(message: string) {
  // Common patterns in document-related notification messages
  const patterns = [
    /(?:document has been shared with you: |(?:A new )?document has been (?:released to [^:]+: |created: |updated: |marked as completed: |received for review: ))(.+)/i,
    /(?:Contract )(.+?)(?: has been signed by )/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const docInfo = match[1].trim();
      // Try to separate document name and code if they exist in the format "Name (CODE)"
      // This pattern matches typical document titles like "Document Name (DOC_CODE)" or "Report Title (ABC123)"
      const nameCodeMatch = docInfo.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (nameCodeMatch) {
        return {
          name: nameCodeMatch[1].trim(),
          code: nameCodeMatch[2].trim(),
        };
      }
      // If no code found but it looks like a UUID, return empty strings since it's probably just a UUID
      if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(docInfo)) {
        return {
          name: "",
          code: "",
        };
      }
      // If no code found, return the whole string as name
      return {
        name: docInfo,
        code: null,
      };
    }
  }

  // If no pattern matches, return the original message
  return {
    name: message,
    code: null,
  };
}
