import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { generateQRData, type QRInputRow } from "@/lib/qrGenerator";

export type QRPlacement = {
  qrFieldName?: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FilledPdfResult = {
  pdfBytes: Uint8Array;
  fileName: string;
};

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

  const textField = form.getTextField(matchedName);
  textField.setText(value);
}

export async function fillTemplatePdfWithRow(
  templatePdfBuffer: Buffer,
  row: QRInputRow,
  placement: QRPlacement,
  flatten: boolean
): Promise<FilledPdfResult> {
  const data = generateQRData(row);
  const pdfDoc = await PDFDocument.load(templatePdfBuffer);
  const form = pdfDoc.getForm();
  const fieldNames = new Set(form.getFields().map((field) => field.getName()));
  const fieldNameByLowercase = new Map(Array.from(fieldNames).map((name) => [name.toLowerCase(), name]));

  // Fill known fields if present in the AcroForm.
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

  for (const [rawKey, rawValue] of Object.entries(row)) {
    setTextFieldIfExists(
      fieldNames,
      fieldNameByLowercase,
      form,
      String(rawKey),
      String(rawValue ?? "")
    );
  }

  const qrPngBuffer = await QRCode.toBuffer(data.finalString, {
    margin: 1,
    width: Math.max(64, Math.round(placement.width)),
  });

  const qrImage = await pdfDoc.embedPng(qrPngBuffer);
  const resolvedQrFieldName = placement.qrFieldName
    ? fieldNameByLowercase.get(placement.qrFieldName.toLowerCase())
    : undefined;

  let qrPlacedInFormField = false;

  if (resolvedQrFieldName) {
    try {
      // AcroForm QR fields should be created as a button field in the template.
      const qrButtonField = form.getButton(resolvedQrFieldName);
      qrButtonField.setImage(qrImage);
      qrPlacedInFormField = true;
    } catch {
      qrPlacedInFormField = false;
    }
  }

  if (!qrPlacedInFormField) {
    const pages = pdfDoc.getPages();
    const page = pages[placement.pageIndex] ?? pages[0];

    page.drawImage(qrImage, {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    });
  }

  if (flatten) {
    form.flatten();
  }

  const pdfBytes = await pdfDoc.save();
  const fileName = `${data.placa || "sin-placa"}.pdf`;

  return {
    pdfBytes,
    fileName,
  };
}
