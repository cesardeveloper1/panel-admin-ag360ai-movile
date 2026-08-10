import type { ReactNode } from 'react';

/**
 * Formato de mensajes de chat:
 * - `*negrita*` y `/n` → saltos
 * - URLs Cloudinary / blob Azure → <img>
 * - Adjuntos audio → <audio>
 */

export function extractImageUrls(text: string): string[] {
  const urlPatterns = [
    /https:\/\/res\.cloudinary\.com\/[^\s]+/g,
    /https:\/\/cloudinarycopy\.blob\.core\.windows\.net\/[^\s]+/g,
  ];
  const withIndex: { url: string; index: number }[] = [];
  const seen = new Set<string>();
  for (const regex of urlPatterns) {
    let m: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((m = regex.exec(text)) !== null) {
      const url = m[0].replace(/[.,;:!?)]+$/, '');
      if (!seen.has(url)) {
        seen.add(url);
        withIndex.push({ url, index: m.index });
      }
    }
  }
  return withIndex.sort((a, b) => a.index - b.index).map((x) => x.url);
}

export function isKnownImageHost(url: string): boolean {
  return (
    url.includes('res.cloudinary.com') ||
    url.includes('cloudinarycopy.blob.core.windows.net')
  );
}

export function shouldRenderAsImage(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
  const hasImageExt = imageExtensions.some((ext) => url.toLowerCase().includes(ext));
  return hasImageExt || isKnownImageHost(url);
}

function shouldRenderAsAudio(url: string, mediaType?: string): boolean {
  if (mediaType === 'audio') return true;
  const audioExtensions = ['.ogg', '.opus', '.webm', '.mp3', '.mpeg', '.mp4', '.m4a', '.aac', '.amr'];
  return audioExtensions.some((ext) => url.toLowerCase().includes(ext));
}

/** Negrita estilo WhatsApp (`*texto*`) + `/n` como salto de línea. */
function renderTextPart(part: string, key: string): ReactNode {
  if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
    return <strong key={key}>{part.slice(1, -1)}</strong>;
  }

  const urlPattern = /(https?:\/\/[^\s]+)/g;
  return part.split(urlPattern).map((piece, index) => {
    if (!piece.startsWith('http://') && !piece.startsWith('https://')) {
      return <span key={`${key}-${index}`}>{piece}</span>;
    }

    const url = piece.replace(/[.,;:!?\)\]\}]+$/, '');
    const trailing = piece.slice(url.length);
    return (
      <span key={`${key}-${index}`}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
        {trailing}
      </span>
    );
  });
}

export function formatTextWithMarkdown(text: string): ReactNode {
  const textWithLineBreaks = text.replace(/\/n/g, '\n');
  const lines = textWithLineBreaks.split('\n');

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*[^*]+\*)/g);
    const formattedParts = parts.map((part, partIndex) => {
      return renderTextPart(part, `${lineIndex}-${partIndex}`);
    });

    if (lineIndex < lines.length - 1) {
      return (
        <span key={lineIndex}>
          {formattedParts}
          <br />
        </span>
      );
    }
    return <span key={lineIndex}>{formattedParts}</span>;
  });
}

export interface ChatMessageBodyProps {
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}

/**
 * Cuerpo de burbuja: texto con negrita + imágenes/audio embebidos.
 */
export function ChatMessageBody({ content, mediaUrl, mediaType }: ChatMessageBodyProps) {
  const text = content ?? '';
  const imageUrls = extractImageUrls(text);
  const attachmentIsAudio =
    Boolean(mediaUrl) && shouldRenderAsAudio(mediaUrl!, mediaType);
  const attachmentIsImage =
    Boolean(mediaUrl) &&
    !attachmentIsAudio &&
    (mediaType === 'image' || shouldRenderAsImage(mediaUrl!));

  if (attachmentIsAudio && mediaUrl) {
    return (
      <div className="chat-bubble__rich">
        {text.trim() && text.trim().toLowerCase() !== 'audio' ? (
          <div className="chat-bubble__body">{formatTextWithMarkdown(text)}</div>
        ) : null}
        <div className="chat-bubble__media chat-bubble__media--audio">
          <audio controls preload="metadata" src={mediaUrl}>
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
              Abrir audio
            </a>
          </audio>
        </div>
      </div>
    );
  }

  if (imageUrls.length === 0 && !attachmentIsImage) {
    return <div className="chat-bubble__body">{formatTextWithMarkdown(text)}</div>;
  }

  const elements: ReactNode[] = [];

  if (attachmentIsImage && mediaUrl && !imageUrls.includes(mediaUrl)) {
    if (text.trim()) {
      elements.push(
        <div key="text-before-att" className="chat-bubble__body">
          {formatTextWithMarkdown(text)}
        </div>,
      );
    }
    elements.push(
      <div key="att-img" className="chat-bubble__media">
        <img
          src={mediaUrl}
          alt="Imagen del mensaje"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const link = document.createElement('a');
            link.href = mediaUrl;
            link.textContent = 'Ver imagen';
            link.className = 'chat-bubble__media-fallback';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            target.parentElement?.appendChild(link);
          }}
        />
      </div>,
    );
    return <div className="chat-bubble__rich">{elements}</div>;
  }

  let remainingText = text;
  imageUrls.forEach((url, index) => {
    const urlIndex = remainingText.indexOf(url);
    if (urlIndex > 0) {
      const before = remainingText.substring(0, urlIndex).trim();
      if (before) {
        elements.push(
          <div key={`text-${index}`} className="chat-bubble__body">
            {formatTextWithMarkdown(before)}
          </div>,
        );
      }
    }

    if (shouldRenderAsImage(url)) {
      elements.push(
        <div key={`image-${index}`} className="chat-bubble__media">
          <img
            src={url}
            alt="Imagen del mensaje"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const link = document.createElement('a');
              link.href = url;
              link.textContent = 'Ver imagen';
              link.className = 'chat-bubble__media-fallback';
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              target.parentElement?.appendChild(link);
            }}
          />
        </div>,
      );
    } else {
      elements.push(
        <a
          key={`link-${index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-bubble__media-fallback"
        >
          {url}
        </a>,
      );
    }

    remainingText = remainingText.substring(urlIndex + url.length);
  });

  if (remainingText.trim()) {
    elements.push(
      <div key="text-final" className="chat-bubble__body">
        {formatTextWithMarkdown(remainingText.trim())}
      </div>,
    );
  }

  return <div className="chat-bubble__rich">{elements}</div>;
}
