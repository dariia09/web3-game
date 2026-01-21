import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const MAGIC = Buffer.from('RCPDF001');
export function parseKey(value) {
  if (!/^[0-9a-f]{64}$/i.test(value || '')) throw new Error('DESIGN_PDF_KEY must be 64 hexadecimal characters');
  return Buffer.from(value, 'hex');
}
export function encryptPdf(pdf, key) {
  if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Expected a PDF');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(MAGIC);
  const data = Buffer.concat([cipher.update(pdf), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), data]);
}
export function decryptPdf(envelope, key) {
  if (envelope.length < 37 || !envelope.subarray(0, 8).equals(MAGIC)) throw new Error('Invalid encrypted document');
  const decipher = createDecipheriv('aes-256-gcm', key, envelope.subarray(8, 20));
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(envelope.subarray(20, 36));
  let pending;
  try {
    // Authenticate the complete document before returning any plaintext.
    pending = decipher.update(envelope.subarray(36));
    const tail = decipher.final();
    const result = Buffer.concat([pending, tail]);
    pending.fill(0); tail.fill(0);
    return result;
  } catch (error) {
    pending?.fill(0);
    throw error;
  }
}
