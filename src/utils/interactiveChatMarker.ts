export type InteractiveChatKind = 'list' | 'quick_replies';

export interface InteractiveChatBlock {
  kind: InteractiveChatKind;
  options: string[];
}

const MARKER = /\[(list|quick_replies):([^\]]*)]/gi;

function optionLabel(token: string): string | null {
  const raw = token.trim();
  if (!raw) return null;
  if (raw.startsWith('t:')) {
    try {
      return decodeURIComponent(raw.slice(2)).trim() || null;
    } catch {
      return raw.slice(2).trim() || null;
    }
  }
  const suffix = raw.slice(raw.lastIndexOf('_') + 1);
  if (suffix === 'yes') return 'Sí';
  if (suffix === 'no') return 'No';
  if (/^\d+$/.test(suffix)) return suffix;
  return null;
}

/** Separa el texto visible de los marcadores de encuesta (lista o botones). */
export function parseInteractiveMessage(content: string): {
  text: string;
  blocks: InteractiveChatBlock[];
} {
  const blocks: InteractiveChatBlock[] = [];
  const text = (content ?? '')
    .replace(MARKER, (_match, kind: string, body: string) => {
      const options = body
        .split(',')
        .map(optionLabel)
        .filter((label): label is string => Boolean(label));
      blocks.push({
        kind: kind.toLowerCase() === 'list' ? 'list' : 'quick_replies',
        options,
      });
      return '';
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, blocks };
}

/** Vista previa de bandeja: la pregunta, sin el marcador interno. */
export function interactivePreview(content: string): string {
  const { text, blocks } = parseInteractiveMessage(content);
  if (text) return text.replace(/\s+/g, ' ').trim();
  return blocks
    .map((block) =>
      block.kind === 'quick_replies'
        ? block.options.join(' · ')
        : block.options.length
          ? `Ver opciones: ${block.options.join(', ')}`
          : 'Ver opciones',
    )
    .filter(Boolean)
    .join(' · ');
}
