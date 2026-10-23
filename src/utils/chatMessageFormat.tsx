import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  parseInteractiveMessage,
  type InteractiveChatBlock,
} from './interactiveChatMarker';
import {
  locationFromMessage,
  resolveChatMessageMedia,
  type ChatMediaItem,
} from './chatMessageMedia';

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

    const url = piece.replace(/[.,;:!?)\]}]+$/, '');
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

function InteractiveOptions({ blocks }: { blocks: InteractiveChatBlock[] }) {
  if (!blocks.length) return null;
  return (
    <div className="chat-bubble__options">
      {blocks.map((block, index) =>
        block.kind === 'quick_replies' ? (
          <Fragment key={index}>
            {block.options.map((label, optionIndex) => (
              <div key={`${index}-${optionIndex}`} className="chat-bubble__option">
                {label}
              </div>
            ))}
          </Fragment>
        ) : (
          <div key={index} className="chat-bubble__option chat-bubble__option--list">
            <span className="chat-bubble__option-title">
              <svg viewBox="0 0 16 16" className="chat-bubble__option-icon" aria-hidden="true">
                <path d="M2 3.5h12M2 8h12M2 12.5h12" />
              </svg>
              Ver opciones
            </span>
            {block.options.length > 0 ? (
              <span className="chat-bubble__option-values">{block.options.join(' · ')}</span>
            ) : null}
          </div>
        ),
      )}
    </div>
  );
}

function withInteractive(node: ReactNode, blocks: InteractiveChatBlock[]) {
  if (!blocks.length) return node;
  return (
    <>
      {node}
      <InteractiveOptions blocks={blocks} />
    </>
  );
}

export interface ChatMessageBodyProps {
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  messageType?: string;
  attachments?: Array<{ type?: string; url?: string; name?: string }>;
  interactiveReply?: { kind?: string; title?: string };
  storyMentionUrl?: string;
  contentNoticeAccepted?: boolean;
  referral?: { sourceType?: string; headline?: string; body?: string; sourceId?: string };
}

function safeStoryUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return parsed.href;
  } catch {
    return undefined;
  }
  return undefined;
}

function MediaPiece({ item }: { item: ChatMediaItem }) {
  const { t } = useTranslation();
  if (item.type === 'image') {
    return (
      <div className="chat-bubble__media">
        <img src={item.url} alt="Imagen" loading="lazy" />
      </div>
    );
  }
  if (item.type === 'audio') {
    return (
      <div className="chat-bubble__media chat-bubble__media--audio">
        <audio controls preload="metadata" src={item.url}>
          <a href={item.url} target="_blank" rel="noopener noreferrer">{item.name || item.url}</a>
        </audio>
      </div>
    );
  }
  if (item.type === 'video') {
    return <video controls src={item.url} className="chat-bubble__video" />;
  }
  return (
    <a className="chat-bubble__doc" href={item.url} target="_blank" rel="noopener noreferrer">
      {item.name || t('chats.openDocument')}
    </a>
  );
}

/**
 * Cuerpo de burbuja: texto, adjuntos y los mismos avisos que el panel.
 */
export function ChatMessageBody({
  content,
  mediaUrl,
  mediaType,
  messageType,
  attachments,
  interactiveReply,
  storyMentionUrl,
  contentNoticeAccepted,
  referral,
}: ChatMessageBodyProps) {
  const { t } = useTranslation();
  const extras = (
    <>
      {interactiveReply ? (
        <div className="chat-bubble__reply">
          <strong>{interactiveReply.kind === 'quick_reply' ? t('chats.quickReply') : t('chats.buttonReply')}:</strong>{' '}
          {interactiveReply.title || t('chats.selectedAction')}
        </div>
      ) : null}
      {referral ? (
        <div className="chat-bubble__reply">
          <strong>
            {referral.sourceType === 'ad' ? t('chats.referralAd') : referral.sourceType === 'post' ? t('chats.referralPost') : t('chats.referralOther')}
          </strong>
          {referral.headline ? <span>{referral.headline}</span> : null}
          {referral.body ? <span>{referral.body}</span> : null}
        </div>
      ) : null}
    </>
  );

  if (messageType === 'empty_template') {
    return (
      <div className="chat-bubble__notice">
        <strong>{t('chats.emptyTemplateTitle')}</strong>
        <span>{t('chats.emptyTemplateDetails')}</span>
      </div>
    );
  }
  if (messageType === 'story_mention') {
    const storyUrl = safeStoryUrl(storyMentionUrl);
    return (
      <div className="chat-bubble__notice">
        <strong>{t('chats.storyTitle')}</strong>
        {content ? <span>{content}</span> : null}
        {storyUrl ? <a href={storyUrl} target="_blank" rel="noopener noreferrer">{t('chats.storyOpen')}</a> : <span>{t('chats.storyUnavailable')}</span>}
        {storyUrl ? <span>{t('chats.storyExpires')}</span> : null}
      </div>
    );
  }
  if (messageType === 'unsupported' || messageType === 'unknown') {
    return (
      <div className="chat-bubble__notice">
        <span>{t('chats.contentUnavailable')}</span>
        {contentNoticeAccepted ? <span>{t('chats.resendRequested')}</span> : null}
      </div>
    );
  }

  const location = locationFromMessage(content ?? '', messageType);
  if (location) {
    const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    return (
      <a className="chat-bubble__location" href={mapsUrl} target="_blank" rel="noopener noreferrer">
        <strong>{Number(location.lat).toFixed(4)}, {Number(location.lng).toFixed(4)}</strong>
        <span>{t('chats.openMaps')}</span>
      </a>
    );
  }

  const merged = [
    ...(mediaUrl ? [{ type: mediaType, url: mediaUrl }] : []),
    ...(attachments ?? []),
  ];
  const resolved = resolveChatMessageMedia(content, { messageType, attachments: merged });
  const parsed = parseInteractiveMessage(resolved.text);
  const elements: ReactNode[] = [];
  if (parsed.text) {
    elements.push(<div key="text" className="chat-bubble__body">{formatTextWithMarkdown(parsed.text)}</div>);
  }
  resolved.media.forEach((item, index) => {
    elements.push(<MediaPiece key={`${item.type}-${index}`} item={item} />);
  });
  return withInteractive(
    <div className="chat-bubble__rich">
      {elements}
      {extras}
    </div>,
    parsed.blocks,
  );
}
