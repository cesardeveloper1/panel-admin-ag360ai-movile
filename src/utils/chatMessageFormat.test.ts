import { describe, expect, it } from 'vitest';
import { extractImageUrls, shouldRenderAsImage } from './chatMessageFormat';

describe('chatMessageFormat', () => {
  it('extrae URL cloudinarycopy del texto', () => {
    const text =
      'Imagen (galería o producto):\nhttps://cloudinarycopy.blob.core.windows.net/imagenes/brands/x.jpg';
    expect(extractImageUrls(text)).toEqual([
      'https://cloudinarycopy.blob.core.windows.net/imagenes/brands/x.jpg',
    ]);
  });

  it('reconoce host conocido como imagen aunque sin extensión', () => {
    expect(shouldRenderAsImage('https://res.cloudinary.com/demo/image/upload/v1/foo')).toBe(
      true,
    );
  });
});
