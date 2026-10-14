import { CONTACT_EMAILS, PUBLIC_CONTACT_EMAIL, PUBLIC_CONTACT_MAILTO } from './brand-lines';
import { FOOTER_LINKS } from './nav.config';

describe('public atelier contact', () => {
  it('is email-only — mailto, no tel: or WhatsApp', () => {
    expect(PUBLIC_CONTACT_EMAIL).toBe('Contact@leonardochiasso.com');
    expect(PUBLIC_CONTACT_MAILTO).toBe(`mailto:${PUBLIC_CONTACT_EMAIL}`);
    expect(PUBLIC_CONTACT_MAILTO).toMatch(/^mailto:/);
    expect(PUBLIC_CONTACT_MAILTO).not.toMatch(/tel:|wa\.me|whatsapp/i);
    expect(PUBLIC_CONTACT_EMAIL).not.toMatch(/\d{2}\s*\d{4,5}/);
  });

  it('keeps every footer atendimento link as mailto or an on-site route', () => {
    for (const link of FOOTER_LINKS.atendimento) {
      const route = link.route ?? '';
      expect(route).withContext(link.label).not.toMatch(/tel:|wa\.me|whatsapp/i);
      expect(route).withContext(link.label).not.toContain('99999-0000');
      if (link.external) {
        expect(route).toMatch(/^mailto:/);
      }
    }
    expect(FOOTER_LINKS.atendimento[0]?.route).toBe(PUBLIC_CONTACT_MAILTO);
    expect(CONTACT_EMAILS.geral.email).toBe(PUBLIC_CONTACT_EMAIL);
  });
});
