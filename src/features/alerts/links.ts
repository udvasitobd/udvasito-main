/**
 * Links a confirmed donor uses (SCR-D04, CMP-ContactCard): call, WhatsApp, directions (ADR-012: Google Maps link,
 * which opens the phone's maps app). Stored numbers are "+8801XXXXXXXXX" (VAL-04).
 */
export function telUrl(phone: string): string {
  return `tel:${phone}`;
}

/** wa.me takes the number with the country code and no "+". */
export function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/^\+/, '')}`;
}

/** A listed hospital opens at its own point; a typed place is searched by its name and area. */
export function directionsUrl(to: { lat: number; lng: number } | null, place: string, area: string): string {
  const destination = to ? `${to.lat},${to.lng}` : [place, area].filter(Boolean).join(', ');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
