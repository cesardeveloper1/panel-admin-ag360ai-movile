import { describe, expect, it } from 'vitest';
import { extractImageUrls, shouldRenderAsImage } from './chatMessageFormat';
import { interactivePreview, parseInteractiveMessage } from './interactiveChatMarker';

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

  it('muestra la escala de una encuesta vieja sin los ids internos', () => {
    const content =
      'Del 1 al 5, ¿qué tan buena fue la atención?\n[list:q_1791617437561_nwg90_1,q_1791617437561_nwg90_2,q_1791617437561_nwg90_3,q_1791617437561_nwg90_4,q_1791617437561_nwg90_5]';
    expect(parseInteractiveMessage(content)).toEqual({
      text: 'Del 1 al 5, ¿qué tan buena fue la atención?',
      blocks: [{ kind: 'list', options: ['1', '2', '3', '4', '5'] }],
    });
    expect(interactivePreview(content)).toBe('Del 1 al 5, ¿qué tan buena fue la atención?');
  });

  it('lee los títulos nuevos de una lista de opciones', () => {
    expect(
      parseInteractiveMessage('¿Cómo nos conociste?\n[list:t:Instagram,t:Cliente%20frecuente]').blocks,
    ).toEqual([{ kind: 'list', options: ['Instagram', 'Cliente frecuente'] }]);
  });
});
