export type ChatMediaType = 'image' | 'document' | 'audio' | 'video';

export interface ChatMediaItem {
  type: ChatMediaType;
  url: string;
  name?: string;
}

export interface ChatMessageMeta {
  messageType?: string;
  attachments?: Array<{ type?: string; url?: string; name?: string }>;
}

const resolveMediaType = (type?: string): ChatMediaType | undefined => {
  if (type === 'file') return 'document';
  if (type === 'image' || type === 'document' || type === 'audio' || type === 'video') return type;
  return undefined;
};

const mediaKey = (value: string): string => {
  try {
    const url = new URL(value);
    if (url.hostname.endsWith('.blob.core.windows.net') && url.searchParams.has('sig')) {
      for (const key of ['sv', 'st', 'se', 'sp', 'sr', 'sig', 'spr', 'sip', 'skoid', 'sktid', 'skt', 'ske', 'sks', 'skv', 'sdd', 'ss', 'srt']) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return `${url.origin}${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return value;
  }
};

const typeFromExtension = (url: string): ChatMediaType | undefined => {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|avif)$/.test(path)) return 'image';
    if (/\.(pdf|docx?|xlsx?|pptx?|csv|txt|zip)$/.test(path)) return 'document';
    if (/\.(mp3|ogg|oga|wav|m4a|aac|opus)$/.test(path)) return 'audio';
    if (/\.(mp4|webm|mov|m4v)$/.test(path)) return 'video';
  } catch {
    /* Las URLs opacas se quedan en el texto. */
  }
  return undefined;
};

const isLegacyImageHost = (value: string): boolean => {
  try {
    const { hostname } = new URL(value);
    return hostname === 'res.cloudinary.com' || hostname === 'cloudinarycopy.blob.core.windows.net';
  } catch {
    return false;
  }
};

const technicalLabelType = (text: string): ChatMediaType | undefined => {
  const label = text.trim();
  if (/^Imagen(?:\s*\(galería o producto\))?:$/i.test(label)) return 'image';
  if (/^(Documento|Archivo):$/i.test(label)) return 'document';
  if (/^Audio:$/i.test(label)) return 'audio';
  if (/^V[ií]deo:$/i.test(label)) return 'video';
  return undefined;
};

const documentName = (value: string): string => {
  try {
    return decodeURIComponent(new URL(value).pathname.split('/').filter(Boolean).pop() || 'Documento');
  } catch {
    return 'Documento';
  }
};

const legacyContentType = (url: string, extensionType?: ChatMediaType): ChatMediaType | undefined => {
  if (extensionType === 'document' && /\.pdf(?:[?#]|$)/i.test(url)) return 'document';
  if (isLegacyImageHost(url)) return extensionType || 'image';
  return undefined;
};

/** Misma presentación que el panel: no altera el contenido guardado. */
export function resolveChatMessageMedia(
  content: string | null | undefined,
  metadata?: ChatMessageMeta,
): { text: string; media: ChatMediaItem[] } {
  const media: ChatMediaItem[] = [];
  const byUrl = new Map<string, ChatMediaItem>();
  for (const attachment of metadata?.attachments ?? []) {
    const type = resolveMediaType(attachment.type);
    const url = attachment.url?.trim();
    if (!type || !url || byUrl.has(mediaKey(url))) continue;
    const item = { type, url, ...(attachment.name ? { name: attachment.name } : {}) };
    media.push(item);
    byUrl.set(mediaKey(url), item);
  }

  const declaredType = resolveMediaType(metadata?.messageType);
  const hasDeclaredAttachment = media.some((item) => item.type === declaredType);
  const source = content ?? '';
  const removals: { start: number; end: number }[] = [];
  for (const match of source.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const raw = match[0];
    const url = raw.replace(/[.,;:!?)]+$/, '');
    const index = match.index ?? 0;
    let lineStart = source.lastIndexOf('\n', index - 1) + 1;
    const before = source.slice(lineStart, index);
    let labelType = technicalLabelType(before);
    if (!before.trim() && lineStart > 0) {
      const previousLineStart = source.lastIndexOf('\n', lineStart - 2) + 1;
      labelType = technicalLabelType(source.slice(previousLineStart, index));
      if (labelType) lineStart = previousLineStart;
    }
    const existing = byUrl.get(mediaKey(url));
    const extensionType = typeFromExtension(url);
    const bareUrlLine = !before.trim() && !source.slice(index + raw.length).split('\n')[0].trim();
    const fallbackType = !hasDeclaredAttachment && (bareUrlLine || labelType) ? declaredType : undefined;
    const inferredType = labelType || (declaredType ? extensionType : undefined) ||
      fallbackType || legacyContentType(url, extensionType);
    const type = existing?.type || inferredType;
    if (!type) continue;
    if (!existing) {
      const item: ChatMediaItem = { type, url, ...(type === 'document' ? { name: documentName(url) } : {}) };
      media.push(item);
      byUrl.set(mediaKey(url), item);
    }
    removals.push({
      start: labelType === type ? lineStart : index,
      end: index + (labelType || bareUrlLine ? raw.length : url.length),
    });
  }

  let text = '';
  let cursor = 0;
  for (const removal of removals) {
    text += source.slice(cursor, removal.start);
    cursor = removal.end;
  }
  text += source.slice(cursor);
  text = text.split('\n').filter((line) => {
    const type = technicalLabelType(line);
    return !type || !media.some((item) => item.type === type);
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return { text, media };
}

export function locationFromMessage(content: string, messageType?: string): { lat: string; lng: string } | null {
  const match = content.match(/coordenadas\s+([-\d.]+),\s*([-\d.]+)/)
    || (messageType === 'location' && content.match(/maps\?q=([-\d.]+),([-\d.]+)/));
  if (!match) return null;
  return { lat: match[1], lng: match[2] };
}
