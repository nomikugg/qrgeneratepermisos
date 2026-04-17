import { randomUUID } from "crypto";

export type PdfTextAlign = "left" | "center" | "right";
export type PdfFontFamily = "helvetica" | "times" | "courier";
export type PdfFieldMode = "value" | "fixed" | "label";

export type PdfMaskBox = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
};

export type PdfBaseTextEdit = {
  id: string;
  page: number;
  originalText?: string;
  sourceFontName?: string;
  sourceFontFamily?: string;
  useOriginalFont?: boolean;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily: PdfFontFamily;
  bold: boolean;
};

export type QRPlacement = {
  qrFieldName?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfEditorField = {
  id: string;
  page: number;
  sourceKey: string;
  label: string;
  template?: string;
  staticValue?: string;
  mode: PdfFieldMode;
  fontFamily: PdfFontFamily;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  align: PdfTextAlign;
  bold: boolean;
  uppercase: boolean;
};

export type PdfLayoutConfig = {
  pageWidth: number;
  pageHeight: number;
  fields: PdfEditorField[];
  masks: PdfMaskBox[];
  baseTextEdits: PdfBaseTextEdit[];
  qr: QRPlacement;
};

export type DetectedPdfTextBlock = {
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DetectedPdfImageBlock = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_PAGE_WIDTH = 612;
const DEFAULT_PAGE_HEIGHT = 792;

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

function normalizeAlign(value: unknown): PdfTextAlign {
  const text = normalizeText(value, "left").toLowerCase();

  if (text === "center" || text === "right") {
    return text;
  }

  return "left";
}

function normalizeField(field: Partial<PdfEditorField>, fallbackId: string): PdfEditorField {
  const fontFamily = normalizeText((field as { fontFamily?: unknown }).fontFamily, "helvetica").toLowerCase();
  const mode = normalizeText((field as { mode?: unknown }).mode, "value").toLowerCase();

  return {
    id: normalizeText(field.id, fallbackId) || fallbackId,
    page: Math.max(0, Math.floor(toNumber((field as { page?: unknown }).page, 0))),
    sourceKey: normalizeText(field.sourceKey, fallbackId) || fallbackId,
    label: normalizeText(field.label, fallbackId) || fallbackId,
    template:
      (field as { template?: unknown }).template == null
        ? undefined
        : normalizeText((field as { template?: unknown }).template),
    staticValue: field.staticValue == null ? undefined : normalizeText(field.staticValue),
    mode: mode === "fixed" || mode === "label" ? mode : "value",
    fontFamily: fontFamily === "times" || fontFamily === "courier" ? fontFamily : "helvetica",
    x: toNumber(field.x, 0),
    y: toNumber(field.y, 0),
    width: Math.max(0, toNumber(field.width, 120)),
    height: Math.max(18, toNumber((field as { height?: unknown }).height, 24)),
    fontSize: Math.max(4, toNumber(field.fontSize, 12)),
    color: normalizeText(field.color, "#111111") || "#111111",
    align: normalizeAlign(field.align),
    bold: Boolean(field.bold),
    uppercase: field.uppercase !== false,
  };
}

function normalizeMask(mask: Partial<PdfMaskBox>, fallbackId: string): PdfMaskBox {
  return {
    id: normalizeText(mask.id, fallbackId) || fallbackId,
    label: normalizeText(mask.label, "Borrado base") || "Borrado base",
    x: toNumber(mask.x, 0),
    y: toNumber(mask.y, 0),
    width: Math.max(0, toNumber(mask.width, 120)),
    height: Math.max(18, toNumber(mask.height, 32)),
    color: normalizeText(mask.color, "#FFFFFF") || "#FFFFFF",
    opacity: Math.min(1, Math.max(0, toNumber(mask.opacity, 1))),
  };
}

function normalizeBaseTextEdit(edit: Partial<PdfBaseTextEdit>, fallbackId: string): PdfBaseTextEdit {
  const fontFamily = normalizeText((edit as { fontFamily?: unknown }).fontFamily, "helvetica").toLowerCase();

  return {
    id: normalizeText(edit.id, fallbackId) || fallbackId,
    page: Math.max(0, Math.floor(toNumber((edit as { page?: unknown }).page, 0))),
    originalText: edit.originalText == null ? undefined : normalizeText(edit.originalText),
    sourceFontName:
      (edit as { sourceFontName?: unknown }).sourceFontName == null
        ? undefined
        : normalizeText((edit as { sourceFontName?: unknown }).sourceFontName),
    sourceFontFamily:
      (edit as { sourceFontFamily?: unknown }).sourceFontFamily == null
        ? undefined
        : normalizeText((edit as { sourceFontFamily?: unknown }).sourceFontFamily),
    useOriginalFont: (edit as { useOriginalFont?: unknown }).useOriginalFont !== false,
    text: normalizeText(edit.text, "Texto"),
    x: toNumber(edit.x, 0),
    y: toNumber(edit.y, 0),
    width: Math.max(24, toNumber(edit.width, 120)),
    height: Math.max(12, toNumber(edit.height, 20)),
    fontSize: Math.max(6, toNumber(edit.fontSize, 12)),
    color: normalizeText(edit.color, "#111111") || "#111111",
    fontFamily: fontFamily === "times" || fontFamily === "courier" ? fontFamily : "helvetica",
    bold: Boolean(edit.bold),
  };
}

function normalizeQrPlacement(value: Partial<QRPlacement> | undefined): QRPlacement {
  return {
    qrFieldName: normalizeText(value?.qrFieldName, "") || undefined,
    x: toNumber(value?.x, 420),
    y: toNumber(value?.y, 470),
    width: Math.max(32, toNumber(value?.width, 120)),
    height: Math.max(32, toNumber(value?.height, 120)),
  };
}

export function createDefaultPdfLayout(): PdfLayoutConfig {
  return {
    pageWidth: DEFAULT_PAGE_WIDTH,
    pageHeight: DEFAULT_PAGE_HEIGHT,
    qr: normalizeQrPlacement(undefined),
    masks: [],
    baseTextEdits: [],
    fields: [],
  };
}

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function findFirstByNeedle(blocks: DetectedPdfTextBlock[], needle: string): DetectedPdfTextBlock | undefined {
  const normalizedNeedle = normalizeForSearch(needle);
  return blocks.find((block) => normalizeForSearch(block.text).includes(normalizedNeedle));
}

function createFieldFromBlock(
  block: DetectedPdfTextBlock,
  id: string,
  sourceKey: string,
  template: string,
  bold = false
): PdfEditorField {
  const suggestedHeight = Math.max(18, Math.round(block.height));
  const suggestedSize = Math.max(10, Math.round(suggestedHeight * 0.72));

  return normalizeField(
    {
      id,
      page: block.page,
      sourceKey,
      template,
      x: Math.round(block.x),
      y: Math.round(block.y),
      width: Math.max(120, Math.round(block.width)),
      height: suggestedHeight,
      fontSize: suggestedSize,
      bold,
      uppercase: true,
    },
    id
  );
}

export function buildPermitFieldsFromDetectedBlocks(blocks: DetectedPdfTextBlock[]): PdfEditorField[] {
  const fields: PdfEditorField[] = [];

  const institutionBlock = findFirstByNeedle(blocks, "INSTITUCION:");
  if (institutionBlock) {
    fields.push(createFieldFromBlock(institutionBlock, "institucion", "institucion", "Instituci\u00F3n: ${institucion}"));
  }

  const conductorBlock = findFirstByNeedle(blocks, "CONDUCTOR:");
  if (conductorBlock) {
    fields.push(createFieldFromBlock(conductorBlock, "conductor_linea", "conductor", "Conductor: ${conductor}"));
  }

  const licenciaBlock = findFirstByNeedle(blocks, "LICENCIA PARA CONDUCIR:");
  if (licenciaBlock) {
    fields.push(createFieldFromBlock(licenciaBlock, "licencia_linea", "licencia", "Licencia para conducir: ${licencia}"));
  }

  const marcaBlock = findFirstByNeedle(blocks, "MARCA VEHICULO:") ?? findFirstByNeedle(blocks, "MARCA VEH\u00CDCULO:");
  if (marcaBlock) {
    fields.push(createFieldFromBlock(marcaBlock, "marca_linea", "marca", "Marca veh\u00EDculo: ${marca}"));
  }

  const colorBlock = findFirstByNeedle(blocks, "COLOR:");
  if (colorBlock) {
    fields.push(createFieldFromBlock(colorBlock, "color_linea", "color", "Color: ${color}"));
  }

  const solicitanteBlock = findFirstByNeedle(blocks, "SOLICITANTE:");
  if (solicitanteBlock) {
    fields.push(createFieldFromBlock(solicitanteBlock, "solicitante_linea", "solicitante", "Solicitante: ${solicitante}"));
  }

  const placaBlocks = blocks
    .filter((block) => {
      const text = String(block.text || "").trim().toUpperCase();
      return !text.includes(":") && /^[0-9A-Z]{5,8}$/.test(text);
    })
    .sort((a, b) => b.y - a.y)
    .slice(0, 2);

  if (placaBlocks[0]) {
    fields.push(createFieldFromBlock(placaBlocks[0], "placa_arriba", "placa", "${placa}", true));
  }
  if (placaBlocks[1]) {
    fields.push(createFieldFromBlock(placaBlocks[1], "placa_abajo", "placa", "${placa}", true));
  }

  return fields;
}

export function buildQrPlacementFromDetectedImages(images: DetectedPdfImageBlock[], fallback: QRPlacement): QRPlacement {
  if (images.length === 0) {
    return fallback;
  }

  const sorted = [...images]
    .filter((img) => img.width >= 40 && img.height >= 40)
    .map((img) => ({
      ...img,
      area: img.width * img.height,
      ratioPenalty: Math.abs((img.width / Math.max(img.height, 1)) - 1),
    }))
    .sort((a, b) => {
      const scoreA = a.area - a.ratioPenalty * 1200;
      const scoreB = b.area - b.ratioPenalty * 1200;
      return scoreB - scoreA;
    });

  const best = sorted[0];
  if (!best) {
    return fallback;
  }

  return normalizeQrPlacement({
    x: Math.round(best.x),
    y: Math.round(best.y),
    width: Math.round(best.width),
    height: Math.round(best.height),
  });
}

export function buildQrCleanupMask(images: DetectedPdfImageBlock[]): PdfMaskBox | null {
  const best = buildQrPlacementFromDetectedImages(images, normalizeQrPlacement(undefined));
  if (!best || best.width < 40 || best.height < 40) {
    return null;
  }

  return normalizeMask(
    {
      id: "auto-qr-cleanup",
      label: "Limpieza QR detectado",
      x: best.x,
      y: best.y,
      width: best.width,
      height: best.height,
      color: "#FFFFFF",
      opacity: 1,
    },
    "auto-qr-cleanup"
  );
}

export function normalizePdfLayoutConfig(value: unknown): PdfLayoutConfig {
  const layout = typeof value === "object" && value !== null ? (value as Partial<PdfLayoutConfig>) : {};
  const fallback = createDefaultPdfLayout();
  const fields = Array.isArray(layout.fields) ? layout.fields : fallback.fields;

  return {
    pageWidth: Math.max(100, toNumber(layout.pageWidth, fallback.pageWidth)),
    pageHeight: Math.max(100, toNumber(layout.pageHeight, fallback.pageHeight)),
    qr: normalizeQrPlacement(layout.qr ?? fallback.qr),
    fields: fields.map((field, index) => normalizeField(field, `field-${index + 1}`)),
    masks: Array.isArray(layout.masks)
      ? layout.masks.map((mask, index) => normalizeMask(mask, `mask-${index + 1}`))
      : [],
    baseTextEdits: Array.isArray(layout.baseTextEdits)
      ? layout.baseTextEdits.map((edit, index) => normalizeBaseTextEdit(edit, `base-text-${index + 1}`))
      : [],
  };
}

export function createPdfLayoutFieldId(): string {
  return randomUUID();
}