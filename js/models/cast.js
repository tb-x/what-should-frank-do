// The recurring cast. Stories refer to people by these ids. A new character is one more entry.
// Hair styles: spiky, short, buzz, curly, bob, pigtails, ponytail, bun, long.
// Bottoms: trousers, shorts, skirt, dress.
import { Person } from './person.js';

const SKIN = { light: 0xffd9bf, peach: 0xf6c49f, tan: 0xd9a073, brown: 0xa86d48, dark: 0x6f4630 };

export const CAST = {
  frank: {
    name: 'Frank', role: 'hero',
    skin: SKIN.peach, hair: 0xf7da7a, brows: 0xc9a043, hairStyle: 'spiky',
    shirt: 0xe8433f, badge: 'star', pants: 0x3c5fa8, bottom: 'trousers', shoes: 0x2f2f3a,
  },
  leo: {
    name: 'Leo',
    skin: SKIN.light, hair: 0xf2c14e, hairStyle: 'short',
    shirt: 0x3fa7ff, stripes: 0xffffff, pants: 0x4a4a5a, bottom: 'shorts', shoes: 0xff7a1a,
  },
  maya: {
    name: 'Maya',
    skin: SKIN.brown, hair: 0x2b1b14, hairStyle: 'pigtails', ties: 0xffd23f,
    shirt: 0xffd23f, pants: 0x9b6bff, bottom: 'skirt', socks: 0xffffff, shoes: 0xe8433f,
  },
  zoe: {
    name: 'Zoe',
    skin: SKIN.light, hair: 0xc8642a, hairStyle: 'bob',
    shirt: 0x5bd16b, bottom: 'dress', pants: 0x5bd16b, socks: 0xfff2c4, shoes: 0x3c5fa8,
  },
  sam: {
    name: 'Sam',
    skin: SKIN.dark, hair: 0x1a1110, hairStyle: 'curly',
    shirt: 0xff9f1c, pants: 0x2e8a57, bottom: 'trousers', shoes: 0xffffff,
  },
  ola: {
    name: 'Ola',
    skin: SKIN.tan, hair: 0x4a2a18, hairStyle: 'ponytail', ties: 0xff5a8a,
    shirt: 0xff8fc8, stripes: 0xffffff, pants: 0x3c5fa8, bottom: 'trousers', shoes: 0xffd23f,
  },
  max: {
    name: 'Max', height: 1.1,
    skin: SKIN.light, hair: 0x3b2a1e, hairStyle: 'short',
    shirt: 0x7a8494, sleeves: 'long', pants: 0x2f3f60, bottom: 'trousers', shoes: 0xe8433f,
  },
  msRosa: {
    name: 'Ms. Rosa', role: 'teacher', adult: true,
    skin: SKIN.peach, hair: 0x5a3220, hairStyle: 'bun',
    shirt: 0x8fd3c8, sleeves: 'long', necklace: 0xff7a5a, bottom: 'skirt', pants: 0x6a4a8a, shoes: 0x6a3a2a,
    glasses: 0x3a2a40,
  },
  mrBen: {
    name: 'Mr. Ben', role: 'teacher', adult: true, height: 1.04,
    skin: SKIN.brown, hair: 0x22160f, hairStyle: 'buzz',
    shirt: 0xf2a541, sleeves: 'long', pants: 0x384860, bottom: 'trousers', shoes: 0x2a2a2a,
  },
};

export const KIDS = Object.keys(CAST).filter((id) => !CAST[id].adult);
export const GROWNUPS = Object.keys(CAST).filter((id) => CAST[id].adult);

// extra: changes to the look, e.g. { face: '3d' } for the older 3D face
export function makePerson(id, extra = {}) {
  return new Person({ id, ...CAST[id], ...extra });
}
