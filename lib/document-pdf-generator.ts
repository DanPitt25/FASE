import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface DocumentGenerationData {
  title: string;
  body: string; // Plain text with line breaks
  date?: string; // Optional date to display
}

export interface DocumentGenerationResult {
  pdfBase64: string;
  title: string;
}

/**
 * Generate a general document PDF using FASE letterhead
 * Simpler than invoice generation - just title and body text
 */
export async function generateDocumentPDF(data: DocumentGenerationData): Promise<DocumentGenerationResult> {
  console.log(`📄 Generating document PDF: ${data.title}`);

  try {
    if (!data.title || !data.body) {
      throw new Error('Missing required fields: title or body');
    }

    // Load the letterhead template
    const letterheadPath = path.join(process.cwd(), 'cleanedpdf.pdf');
    const letterheadBytes = fs.readFileSync(letterheadPath);

    // Load a fresh copy of the template for adding new pages
    const templateDoc = await PDFDocument.load(letterheadBytes);
    const pdfDoc = await PDFDocument.load(letterheadBytes);

    const pages = pdfDoc.getPages();
    let currentPage = pages[0];
    const { width, height } = currentPage.getSize();

    // Embed fonts
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // FASE Brand Colors
    const faseNavy = rgb(0.176, 0.333, 0.455);      // #2D5574
    const faseBlack = rgb(0.137, 0.122, 0.125);     // #231F20

    // Layout settings
    const margins = { left: 50, right: 50, top: 150, bottom: 80 };
    const contentWidth = width - margins.left - margins.right;
    const lineHeight = 16;
    const paragraphGap = 24;

    // Start drawing
    let currentY = height - margins.top;

    // Title
    currentPage.drawText(data.title, {
      x: margins.left,
      y: currentY,
      size: 18,
      font: boldFont,
      color: faseNavy,
    });

    currentY -= 30;

    // Date if provided
    if (data.date) {
      currentPage.drawText(data.date, {
        x: margins.left,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      currentY -= 25;
    }

    // Divider line
    currentPage.drawLine({
      start: { x: margins.left, y: currentY },
      end: { x: width - margins.right, y: currentY },
      thickness: 1,
      color: faseNavy,
    });

    currentY -= 30;

    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number, font: typeof bodyFont, fontSize: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    // Helper function to add a new page
    const addNewPage = async (): Promise<void> => {
      // Copy a fresh letterhead page from the template (not from pdfDoc which has content)
      const [freshPage] = await pdfDoc.copyPages(templateDoc, [0]);
      pdfDoc.addPage(freshPage);
      currentPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
      currentY = height - margins.top;
    };

    // Process body text - split by paragraphs (double newlines or single newlines)
    const paragraphs = data.body.split(/\n\n+/);

    for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
      const paragraph = paragraphs[pIndex].trim();
      if (!paragraph) continue;

      // Check if this is a section header (starts with ## or is all caps and short)
      const isHeader = paragraph.startsWith('##') ||
                       (paragraph.length < 60 && paragraph === paragraph.toUpperCase() && !paragraph.includes('.'));

      const headerText = paragraph.replace(/^##\s*/, '');

      if (isHeader) {
        // Add extra space before headers (except first)
        if (pIndex > 0) {
          currentY -= 10;
        }

        // Check if we need a new page
        if (currentY < margins.bottom + 40) {
          await addNewPage();
        }

        currentPage.drawText(headerText, {
          x: margins.left,
          y: currentY,
          size: 12,
          font: boldFont,
          color: faseNavy,
        });

        currentY -= lineHeight + 8;
      } else {
        // Regular paragraph - wrap and draw lines
        // Handle single line breaks within the paragraph
        const subParagraphs = paragraph.split(/\n/);

        for (const subPara of subParagraphs) {
          const lines = wrapText(subPara.trim(), contentWidth, bodyFont, 10);

          for (const line of lines) {
            // Check if we need a new page
            if (currentY < margins.bottom) {
              await addNewPage();
            }

            currentPage.drawText(line, {
              x: margins.left,
              y: currentY,
              size: 10,
              font: bodyFont,
              color: faseBlack,
            });

            currentY -= lineHeight;
          }

          // Small gap between lines within same paragraph that had line breaks
          currentY -= 4;
        }
      }

      // Gap between paragraphs
      currentY -= paragraphGap - lineHeight;
    }

    // Generate PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    console.log('✅ Document PDF generated, size:', pdfBytes.length);

    return {
      pdfBase64,
      title: data.title,
    };

  } catch (error: any) {
    console.error('❌ Failed to generate document PDF:', error);
    throw error;
  }
}
