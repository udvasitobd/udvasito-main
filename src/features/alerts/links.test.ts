import { describe, expect, it } from 'vitest';

import { directionsUrl, telUrl, whatsappUrl } from './links';

describe('contact links', () => {
  it('call and WhatsApp from a stored number', () => {
    expect(telUrl('+8801812345678')).toBe('tel:+8801812345678');
    expect(whatsappUrl('+8801812345678')).toBe('https://wa.me/8801812345678');
  });

  it('directions: a hospital by its point, a typed place by its name', () => {
    expect(directionsUrl({ lat: 22.3597, lng: 91.8308 }, 'Chattogram Medical College Hospital', 'Panchlaish')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=22.3597%2C91.8308',
    );
    expect(directionsUrl(null, 'Max Hospital, Mehedibag', 'Kotwali')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Max%20Hospital%2C%20Mehedibag%2C%20Kotwali',
    );
  });
});
