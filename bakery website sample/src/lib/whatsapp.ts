const SAMPLE_WHATSAPP_NUMBER = '919876543210';

export function normalizeWhatsAppNumber(value?: string | null) {
  const number = value?.replace(/\D/g, '') ?? '';
  return number === SAMPLE_WHATSAPP_NUMBER ? '' : number;
}

export function getConfiguredWhatsAppNumber() {
  return normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}

export function getWhatsAppUrl(message: string) {
  const number = getConfiguredWhatsAppNumber();
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
