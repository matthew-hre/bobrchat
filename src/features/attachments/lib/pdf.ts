import { PDFDocument } from "pdf-lib";

/**
 * Extracts the page count from a PDF.
 *
 * @param data The PDF file data as ArrayBuffer or Uint8Array
 * @returns The number of pages, or null if extraction fails
 */
export async function getPdfPageCount(data: ArrayBuffer | Uint8Array): Promise<number | null> {
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  }
  catch (error) {
    console.error("Failed to extract PDF page count:", error);
    return null;
  }
}
