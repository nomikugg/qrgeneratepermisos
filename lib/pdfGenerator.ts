import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { clean, generateQRData, type QRInputRow } from "@/lib/qrGenerator";
import { type PdfBaseTextEdit, type PdfEditorField, type PdfFontFamily, type PdfLayoutConfig, type PdfMaskBox, type QRPlacement } from "@/lib/pdfLayout";

export type { QRPlacement } from "@/lib/pdfLayout";

export type FilledPdfResult = {
  pdfBytes: Uint8Array;
  fileName: string;
};

type BackendReplaceOperation = {
  type: "replace";
  page: number;
  fieldId?: string;
  sourceKey?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  color?: string;
  newText: string;
  targetText?: string;
};

const PDF_BACKEND_BASE_URL = process.env.PDF_BACKEND_URL ?? process.env.NEXT_PUBLIC_PDF_BACKEND_URL ?? "http://127.0.0.1:8080";

const templateUploadCache = new Map<string, string>();

function buildTemplateCacheKey(templatePdfBuffer: Buffer): string {
  const head = templatePdfBuffer.subarray(0, Math.min(templatePdfBuffer.length, 64)).toString("base64");
  const tail = templatePdfBuffer.subarray(Math.max(0, templatePdfBuffer.length - 64)).toString("base64");
  return `${templatePdfBuffer.length}:${head}:${tail}`;
}

async function uploadTemplateOnce(templatePdfBuffer: Buffer): Promise<string> {
  const cacheKey = buildTemplateCacheKey(templatePdfBuffer);
  const cached = templateUploadCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const fileId = await uploadPdfToBackend(templatePdfBuffer);
  templateUploadCache.set(cacheKey, fileId);

  // Evita crecimiento sin limite del cache en runtimes largos.
  if (templateUploadCache.size > 16) {
    const firstKey = templateUploadCache.keys().next().value;
    if (firstKey) {
      templateUploadCache.delete(firstKey);
    }
  }

  return fileId;
}

function buildPdfBackendUrl(pathname: string): string {
  return new URL(pathname, PDF_BACKEND_BASE_URL).toString();
}

function parseHexColor(value: string) {
  const normalized = String(value || "").trim().replace(/^#/, "");
  const match = /^([0-9a-fA-F]{6})$/.exec(normalized);

  if (!match) {
    return rgb(0.07, 0.09, 0.12);
  }

  const hex = match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;

  return rgb(red, green, blue);
}

function drawMaskBox(page: PDFPage, mask: PdfMaskBox) {
  page.drawRectangle({
    x: mask.x,
    y: mask.y,
    width: mask.width,
    height: mask.height,
    color: parseHexColor(mask.color),
    opacity: mask.opacity,
    borderWidth: 0,
  });
}

function drawBaseTextEdit(page: PDFPage, font: PDFFont, edit: PdfBaseTextEdit) {
  page.drawRectangle({
    x: edit.x,
    y: edit.y,
    width: edit.width,
    height: edit.height,
    color: rgb(1, 1, 1),
    opacity: 1,
    borderWidth: 0,
  });

  const fitted = fitTextToBox(edit.text, font, edit.fontSize, edit.width, edit.height);
  const lines = fitted.lines;
  if (lines.length === 0) {
    return;
  }

  const lineHeight = Math.max(fitted.fontSize + 1, Math.round(fitted.fontSize * 1.18));
  let currentY = edit.y + Math.max(edit.height - lineHeight, 0);

  for (const line of lines) {
    page.drawText(line, {
      x: edit.x,
      y: currentY,
      size: fitted.fontSize,
      font,
      color: parseHexColor(edit.color),
    });
    currentY -= lineHeight;
    if (currentY < edit.y - lineHeight) {
      break;
    }
  }
}

function applyTemplate(template: string, row: QRInputRow, uppercaseValues: boolean): string {
  return template.replace(/\$\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_full, key: string) => {
    const value = (row as Record<string, unknown>)[key];
    const text = value == null ? "" : String(value);
    return uppercaseValues ? clean(text) : text;
  });
}

function getTextForField(field: PdfEditorField, row: QRInputRow): string {
  if (field.template && field.template.trim()) {
    return applyTemplate(field.template, row, Boolean(field.uppercase));
  }

  const rawValue = field.sourceKey in row ? (row as Record<string, unknown>)[field.sourceKey] : undefined;

  if (field.mode === "fixed") {
    return String(field.staticValue ?? field.label ?? "");
  }

  if (field.mode === "label") {
    return String(field.label ?? "");
  }

  return String(rawValue ?? "").trim() || (field.staticValue != null && field.staticValue !== "" ? field.staticValue : String(field.label ?? ""));
}

function getFontFamily(fontFamily: PdfFontFamily, bold: boolean) {
  if (fontFamily === "times") {
    return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  }

  if (fontFamily === "courier") {
    return bold ? StandardFonts.CourierBold : StandardFonts.Courier;
  }

  return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const normalized = String(text || "").trim();

  if (!normalized) {
    return [];
  }

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth || !currentLine) {
      currentLine = candidate;
      continue;
    }

    if (!currentLine && font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      const broken = breakLongWord(word, font, fontSize, maxWidth);
      lines.push(...broken.slice(0, Math.max(0, broken.length - 1)));
      currentLine = broken[broken.length - 1] ?? "";
      continue;
    }

    lines.push(currentLine);
    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      const broken = breakLongWord(word, font, fontSize, maxWidth);
      lines.push(...broken.slice(0, Math.max(0, broken.length - 1)));
      currentLine = broken[broken.length - 1] ?? "";
    } else {
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function breakLongWord(word: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const chunks: string[] = [];
  let chunk = "";

  for (const ch of word) {
    const candidate = `${chunk}${ch}`;
    if (!chunk || font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      chunk = candidate;
      continue;
    }

    chunks.push(chunk);
    chunk = ch;
  }

  if (chunk) {
    chunks.push(chunk);
  }

  return chunks;
}

function fitTextToBox(text: string, font: PDFFont, preferredFontSize: number, maxWidth: number, maxHeight: number) {
  let fontSize = preferredFontSize;

  while (fontSize > 6) {
    const lines = wrapText(text, font, fontSize, maxWidth);
    const lineHeight = Math.max(fontSize + 2, Math.round(fontSize * 1.2));
    const textHeight = lines.length * lineHeight;

    if (lines.length > 0 && textHeight <= maxHeight + 0.5) {
      return { lines, fontSize };
    }

    fontSize -= 1;
  }

  return { lines: wrapText(text, font, 6, maxWidth), fontSize: 6 };
}

function drawTextField(
  page: PDFPage,
  font: PDFFont,
  field: PdfEditorField,
  row: QRInputRow,
  uppercase: boolean
) {
  const textValue = getTextForField(field, row);
  const normalizedValue = field.template
    ? String(textValue).trim()
    : uppercase
      ? clean(textValue)
      : String(textValue).trim();

  if (!normalizedValue) {
    return;
  }

  const color = parseHexColor(field.color);
  const fitted = fitTextToBox(normalizedValue, font, field.fontSize, field.width, field.height);
  const fontSize = fitted.fontSize;
  const lineHeight = Math.max(fontSize + 2, Math.round(fontSize * 1.2));
  const lines = fitted.lines;

  if (lines.length === 0) {
    return;
  }

  let currentY = field.y;
  for (const line of lines) {
    const lineWidth = font.widthOfTextAtSize(line, fontSize);
    const offsetX = field.align === "center"
      ? Math.max((field.width - lineWidth) / 2, 0)
      : field.align === "right"
        ? Math.max(field.width - lineWidth, 0)
        : 0;

    page.drawText(line, {
      x: field.x + offsetX,
      y: currentY,
      size: fontSize,
      font,
      color,
    });

    currentY -= lineHeight;
  }
}

async function createPdfFromLayout(
  templatePdfBuffer: Buffer | null,
  row: QRInputRow,
  layout: PdfLayoutConfig
): Promise<FilledPdfResult> {
  const data = generateQRData(row);
  const pdfDoc = templatePdfBuffer ? await PDFDocument.load(templatePdfBuffer) : await PDFDocument.create();
  let page = pdfDoc.getPages()[0];

  if (!page) {
    page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);
  }

  for (const mask of layout.masks) {
    drawMaskBox(page, mask);
  }

  for (const edit of layout.baseTextEdits) {
    const font = await pdfDoc.embedFont(getFontFamily(edit.fontFamily, edit.bold));
    drawBaseTextEdit(page, font, edit);
  }

  for (const field of layout.fields) {
    const font = await pdfDoc.embedFont(getFontFamily(field.fontFamily, field.bold));
    drawTextField(page, font, field, row, field.uppercase);
  }

  const qrPngBuffer = await QRCode.toBuffer(data.finalString, {
    margin: 4,
    width: Math.max(300, Math.round(layout.qr.width)),
  });

  const qrImage = await pdfDoc.embedPng(qrPngBuffer);
  page.drawImage(qrImage, {
    x: layout.qr.x,
    y: layout.qr.y,
    width: layout.qr.width,
    height: layout.qr.height,
  });

  const pdfBytes = await pdfDoc.save();

  return {
    pdfBytes,
    fileName: `${data.placa || "sin-placa"}.pdf`,
  };
}

export async function uploadPdfToBackend(templatePdfBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append("file", new Blob([Buffer.from(templatePdfBuffer)], { type: "application/pdf" }), "template.pdf");

  const response = await fetch(buildPdfBackendUrl("/pdf/upload"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "No se pudo subir el PDF al backend.");
  }

  const payload = (await response.json()) as { fileId?: string };
  if (!payload.fileId) {
    throw new Error("El backend no devolvio fileId al subir el PDF.");
  }

  return payload.fileId;
}

async function applyOperationsOnBackend(fileId: string, operations: BackendReplaceOperation[]): Promise<string> {
  console.log("[pdf] apply request", { fileId, operations });
  const response = await fetch(buildPdfBackendUrl("/pdf/apply"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, operations }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "No se pudo aplicar reemplazos en backend.");
  }

  const payload = (await response.json()) as { fileId?: string };
  console.log("[pdf] apply response", payload);
  if (!payload.fileId) {
    throw new Error("El backend no devolvio fileId luego del apply.");
  }

  return payload.fileId;
}

async function downloadPdfFromBackend(fileId: string): Promise<Uint8Array> {
  const response = await fetch(buildPdfBackendUrl(`/pdf/download?fileId=${encodeURIComponent(fileId)}`));

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "No se pudo descargar el PDF editado del backend.");
  }

  return new Uint8Array(await response.arrayBuffer());
}

function buildTextReplaceOperations(layout: PdfLayoutConfig, row: QRInputRow): BackendReplaceOperation[] {
  function findClosestBaseTextEdit(field: PdfEditorField): PdfBaseTextEdit | undefined {
    let best: { score: number; base: PdfBaseTextEdit } | null = null;

    for (const base of layout.baseTextEdits) {
      if (base.page !== field.page) {
        continue;
      }

      const original = String(base.originalText || "").trim();
      if (!original) {
        continue;
      }

      const dx = Math.abs(base.x - field.x);
      const dy = Math.abs(base.y - field.y);
      const score = dy * 10 + dx;

      if (!best || score < best.score) {
        best = { score, base };
      }
    }

    return best?.base;
  }

  const operations: BackendReplaceOperation[] = [];
  console.log("[pdf] source row", row);

  // Temporal override solicitado por usuario.
  const TEMP_TEXT_COLOR = "#231f20";
  const TEMP_TEXT_FONT = "helvetica";
  const TEMP_TEXT_SIZE = 11;
  const TEMP_PLATE_FONT = "arial";
  const TEMP_PLATE_SIZE = 140.116;
  const TEMP_PLATE_TOP_COLOR = "#818080";
  const TEMP_PLATE_BOTTOM_COLOR = "#231f20";

  for (const field of layout.fields) {
    const rawRowValue = (row as Record<string, unknown>)[field.sourceKey];
    const hasValue = String(rawRowValue ?? "").trim().length > 0;

    if (field.template && !hasValue) {
      console.log("[pdf] skip field without csv value", { fieldId: field.id, sourceKey: field.sourceKey, rawRowValue });
      continue;
    }

    const textValue = field.template && field.template.trim()
      ? applyTemplate(field.template, row, Boolean(field.uppercase))
      : getTextForField(field, row);
    const newText = field.template && field.template.trim()
      ? String(textValue || "").trim()
      : field.uppercase
        ? clean(textValue)
        : String(textValue || "").trim();

    if (!newText) {
      console.log("[pdf] skip empty field", { fieldId: field.id, sourceKey: field.sourceKey, textValue });
      continue;
    }

    const closestBase = findClosestBaseTextEdit(field);
    const targetText = closestBase?.originalText?.trim() || undefined;
    const isPlateTop = field.id === "placa_arriba";
    const isPlateBottom = field.id === "placa_abajo";
    const isPlateField = isPlateTop || isPlateBottom;

    const fallbackFontSize = Number.isFinite(field.fontSize) && field.fontSize > 0
      ? field.fontSize
      : closestBase?.fontSize;
    const fallbackFontFamily = field.fontFamily || closestBase?.fontFamily;
    const fallbackBold = typeof field.bold === "boolean" ? field.bold : closestBase?.bold;
    const fallbackColor = (field.color && field.color.trim()) ? field.color : closestBase?.color;

    const effectiveFontSize = isPlateField ? TEMP_PLATE_SIZE : TEMP_TEXT_SIZE;
    const effectiveFontFamily = isPlateField ? TEMP_PLATE_FONT : (fallbackFontFamily ?? TEMP_TEXT_FONT);
    const effectiveBold = isPlateField ? true : (fallbackBold ?? false);
    const effectiveColor = isPlateTop
      ? TEMP_PLATE_TOP_COLOR
      : isPlateBottom
        ? TEMP_PLATE_BOTTOM_COLOR
        : TEMP_TEXT_COLOR;
    console.log("[pdf] build replace op", {
      fieldId: field.id,
      page: field.page,
      sourceKey: field.sourceKey,
      targetText,
      newText,
      fontSize: effectiveFontSize,
      fontFamily: effectiveFontFamily,
      bold: effectiveBold,
      color: effectiveColor,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
    });

    operations.push({
      type: "replace",
      page: Math.max(0, Math.floor(field.page ?? 0)),
      fieldId: field.id,
      sourceKey: field.sourceKey,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      fontSize: effectiveFontSize,
      fontFamily: effectiveFontFamily,
      bold: effectiveBold,
      color: effectiveColor,
      newText,
      targetText,
    });
  }

  console.log("[pdf] final replace operations", operations);
  return operations;
}

async function addQrToPdf(pdfBytes: Uint8Array, layout: PdfLayoutConfig, row: QRInputRow): Promise<Uint8Array> {
  const data = generateQRData(row);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[0];

  if (!page) {
    return pdfBytes;
  }

  const qrPngBuffer = await QRCode.toBuffer(data.finalString, {
    margin: 4,
    width: Math.max(300, Math.round(layout.qr.width)),
  });

  const qrImage = await pdfDoc.embedPng(qrPngBuffer);
  page.drawImage(qrImage, {
    x: layout.qr.x,
    y: layout.qr.y,
    width: layout.qr.width,
    height: layout.qr.height,
  });

  return pdfDoc.save();
}

async function createPdfByBackendReplacement(
  templatePdfBuffer: Buffer,
  row: QRInputRow,
  layout: PdfLayoutConfig
): Promise<FilledPdfResult> {
  const data = generateQRData(row);
  const operations = buildTextReplaceOperations(layout, row);

  const baseFileId = await uploadTemplateOnce(templatePdfBuffer);
  let fileId = baseFileId;
  if (operations.length > 0) {
    fileId = await applyOperationsOnBackend(fileId, operations);
  }

  const replacedPdfBytes = await downloadPdfFromBackend(fileId);
  const finalPdfBytes = await addQrToPdf(replacedPdfBytes, layout, row);

  return {
    pdfBytes: finalPdfBytes,
    fileName: `${data.placa || "sin-placa"}.pdf`,
  };
}

export async function renderPdfWithLayout(
  templatePdfBuffer: Buffer | null,
  row: QRInputRow,
  layout: PdfLayoutConfig
): Promise<FilledPdfResult> {
  if (templatePdfBuffer && templatePdfBuffer.length > 0) {
    return createPdfByBackendReplacement(templatePdfBuffer, row, layout);
  }

  return createPdfFromLayout(templatePdfBuffer, row, layout);
}

function setTextFieldIfExists(
  fieldNames: Set<string>,
  fieldNameByLowercase: Map<string, string>,
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: string
) {
  const normalizedValue = String(value || "");
  const matchedName = fieldNames.has(name) ? name : fieldNameByLowercase.get(name.toLowerCase());

  if (!matchedName || !normalizedValue) {
    return;
  }

  try {
    const textField = form.getTextField(matchedName);
    textField.setText(normalizedValue);
  } catch {
    // Ignora campos no-texto con el mismo nombre.
  }
}

export async function fillTemplatePdfWithRow(
  templatePdfBuffer: Buffer,
  row: QRInputRow,
  placement: QRPlacement
): Promise<FilledPdfResult> {
  const data = generateQRData(row);
  const pdfDoc = await PDFDocument.load(templatePdfBuffer);
  const form = pdfDoc.getForm();
  const fieldNames = new Set(form.getFields().map((field) => field.getName()));
  const fieldNameByLowercase = new Map(Array.from(fieldNames).map((name) => [name.toLowerCase(), name]));

  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "placa", data.placa);
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "modelo", data.modelo);
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "marca", data.marca);
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "anio", data.anio);
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "color", data.color);
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "licencia", data.licencia);
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "conductor", data.conductor);
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "uuid1", data.uuid1);
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "uuid2", data.uuid2);
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "hash", data.hash);
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "numero", String(data.numero));
  setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, "qr_string", data.finalString);

  const knownFieldKeys = new Set([
    "placa",
    "modelo",
    "marca",
    "anio",
    "color",
    "licencia",
    "conductor",
    "uuid1",
    "uuid2",
    "hash",
    "numero",
    "qr_string",
  ]);

  for (const [rawKey, rawValue] of Object.entries(row)) {
    if (knownFieldKeys.has(String(rawKey).toLowerCase())) {
      continue;
    }

    setTextFieldIfExists(fieldNames, fieldNameByLowercase, form, String(rawKey), clean(rawValue));
  }

  const qrPngBuffer = await QRCode.toBuffer(data.finalString, {
    margin: 4,
    width: Math.max(300, Math.round(placement.width)),
  });

  const qrImage = await pdfDoc.embedPng(qrPngBuffer);
  const pages = pdfDoc.getPages();
  const page = pages[0];

  page.drawImage(qrImage, {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
  });

  const pdfBytes = await pdfDoc.save();
  const fileName = `${data.placa || "sin-placa"}.pdf`;

  return {
    pdfBytes,
    fileName,
  };
}
