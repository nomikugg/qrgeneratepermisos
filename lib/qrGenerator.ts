import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const SECRET = "subnacionales";

export type QRInputRow = Record<string, unknown> & {
  placa?: unknown;
  modelo?: unknown;
  marca?: unknown;
  anio?: unknown;
  color?: unknown;
  licencia?: unknown;
  conductor?: unknown;
};

export function clean(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

export function generateQRData(row: QRInputRow) {
  const placa = clean(row.placa);
  const modelo = clean(row.modelo);
  const marca = clean(row.marca);
  const anio = clean(row.anio);
  const color = clean(row.color);
  const licencia = clean(row.licencia);
  const conductor = clean(row.conductor);

  const uuid1 = uuidv4();
  const uuid2 = uuidv4();

  const dataConcat = `${placa}${modelo}${marca}${anio}${color}${licencia}`;

  const numero = Math.floor(Math.random() * 1e11);

  const hash = crypto
    .createHash("sha256")
    .update(dataConcat + SECRET)
    .digest("hex");

  const finalString = `${uuid1}${numero}${dataConcat}${hash}|${uuid2}`;

  return {
    placa,
    modelo,
    marca,
    anio,
    color,
    licencia,
    conductor,
    uuid1,
    uuid2,
    hash,
    numero,
    finalString,
  };
}