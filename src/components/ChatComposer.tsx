import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  attachOutline,
  closeOutline,
  flashOutline,
  happyOutline,
  micOutline,
  sendOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { apiFacade, type QuickMessage, type SendChatAttachment } from '../services/apiFacade';
import { fileUploadService } from '../services/fileUploadService';
import type { ChatConversation } from '../types';
import { config } from '../config/env';
import { useViewport } from '../hooks/useViewport';

const EMOJI_SET = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤩', '🥳',
  '🙂', '😉', '😢', '😭', '😤', '😅', '🤗', '🤔', '😴', '🙌',
  '👍', '👎', '👏', '🙏', '💪', '🔥', '✨', '🎉', '❤️', '💜',
  '🍔', '🍟', '🍕', '🌮', '🥤', '🍺', '☕', '🍰', '📍', '✅',
];

interface ChatComposerProps {
  chat: ChatConversation | null;
  brandId: string;
  subDomain: string;
  disabled?: boolean;
  onSent: (optimistic: import('../types').ChatMessage) => void;
  onError: (i18nKey: string) => void;
}

type FilePreview = {
  url: string;
  file: File;
  isImage: boolean;
};

export function ChatComposer({
  chat,
  brandId,
  subDomain,
  disabled,
  onSent,
  onError,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const { isTablet } = useViewport();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickItems, setQuickItems] = useState<QuickMessage[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [fileCaption, setFileCaption] = useState('');
  const [quickPreview, setQuickPreview] = useState<QuickMessage | null>(null);
  const [quickCaption, setQuickCaption] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isDisabled = Boolean(disabled) || !chat;

  useEffect(() => {
    setDraft('');
    setFilePreview(null);
    setQuickPreview(null);
    setEmojiOpen(false);
    setQuickOpen(false);
  }, [chat?.id]);

  const stopMedia = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  useEffect(() => () => stopMedia(), [stopMedia]);

  const loadQuickMessages = useCallback(async () => {
    if (!brandId) return;
    setQuickLoading(true);
    try {
      const items = await apiFacade.listQuickMessages(brandId);
      setQuickItems(items);
    } catch {
      setQuickItems([]);
      onError('chats.quickLoadError');
    } finally {
      setQuickLoading(false);
    }
  }, [brandId, onError]);

  useEffect(() => {
    if (quickOpen) void loadQuickMessages();
  }, [quickOpen, loadQuickMessages]);

  const filteredQuick = useMemo(() => {
    const term = quickSearch.trim().toLowerCase();
    if (!term) return quickItems;
    return quickItems.filter(
      (item) =>
        item.shortcut.toLowerCase().includes(term) ||
        item.text.toLowerCase().includes(term),
    );
  }, [quickItems, quickSearch]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const appendEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    setEmojiOpen(false);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const sendPayload = async (text: string, attachments?: SendChatAttachment[]) => {
    if (!chat || !subDomain) return;
    if (!text.trim() && !attachments?.length) return;
    setSending(true);
    try {
      const sent = await apiFacade.sendChatMessage(chat, text, subDomain, attachments);
      if (sent) onSent(sent);
      setDraft('');
      setFilePreview(null);
      setFileCaption('');
      setQuickPreview(null);
      setQuickCaption('');
      setQuickOpen(false);
      setEmojiOpen(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch {
      onError('chats.sendError');
    } finally {
      setSending(false);
    }
  };

  const onSendText = () => {
    if (sending || uploading || isDisabled) return;
    void sendPayload(draft.trim());
  };

  const onPickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !chat) return;

    const allowedImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const isImage = allowedImage.includes(file.type.toLowerCase());
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      onError('chats.fileTypeError');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError('chats.fileSizeError');
      return;
    }
    if (!brandId) {
      onError('chats.brandMissing');
      return;
    }

    if (config.useApiMock) {
      const url = URL.createObjectURL(file);
      setFilePreview({ url, file, isImage });
      setFileCaption(draft.trim());
      return;
    }

    setUploading(true);
    try {
      const url = isImage
        ? await fileUploadService.uploadImage(file, brandId)
        : await fileUploadService.uploadPdf(file, brandId);
      setFilePreview({ url, file, isImage });
      setFileCaption(draft.trim());
    } catch {
      onError('chats.uploadError');
    } finally {
      setUploading(false);
    }
  };

  const onSendFilePreview = () => {
    if (!filePreview) return;
    const caption = fileCaption.trim() || undefined;
    const attachment: SendChatAttachment = filePreview.isImage
      ? { type: 'image', url: filePreview.url, caption }
      : { type: 'document', url: filePreview.url, filename: filePreview.file.name };
    void sendPayload(
      filePreview.isImage ? '' : caption || '',
      [attachment],
    );
  };

  const onSelectQuick = (item: QuickMessage) => {
    if (item.images?.length) {
      setQuickPreview(item);
      setQuickCaption(item.text);
      setQuickOpen(false);
      return;
    }
    setDraft(item.text);
    setQuickOpen(false);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const onSendQuickPreview = () => {
    if (!quickPreview) return;
    const attachments: SendChatAttachment[] = (quickPreview.images ?? []).map((url) => ({
      type: 'image',
      url,
      caption: quickCaption.trim() || undefined,
    }));
    void sendPayload(quickCaption.trim(), attachments);
  };

  const sendRecordedAudio = async (blob: Blob) => {
    if (!chat || !brandId || blob.size === 0) return;
    setUploading(true);
    try {
      const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
      const file = new File([blob], `audio-${Date.now()}.${extension}`, {
        type: blob.type || 'audio/webm',
      });
      const url = config.useApiMock
        ? URL.createObjectURL(file)
        : await fileUploadService.uploadAudio(file, brandId);
      await sendPayload('', [{ type: 'audio', url, filename: file.name }]);
    } catch {
      onError('chats.uploadError');
    } finally {
      setUploading(false);
    }
  };

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setIsRecording(false);
      stopMedia();
      return;
    }
    recorder.stop();
  }, [stopMedia]);

  const startRecording = async () => {
    if (isDisabled || busy || isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError('chats.micUnavailable');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : undefined;
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setIsRecording(false);
        stopMedia();
        void sendRecordedAudio(blob);
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
      stopMedia();
      onError('chats.micDenied');
    }
  };

  const showSend = Boolean(draft.trim()) || uploading || sending;
  const busy = sending || uploading;

  return (
    <div className="chat-composer-wrap">
      {emojiOpen ? (
        <div className="chat-emoji-sheet" role="listbox" aria-label={t('chats.emojiAria')}>
          {EMOJI_SET.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="chat-emoji-sheet__btn"
              onClick={() => appendEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      {quickOpen ? (
        <div className="chat-quick-sheet" role="dialog" aria-label={t('chats.quickAria')}>
          <div className="chat-quick-sheet__head">
            <IonIcon icon={flashOutline} />
            <input
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder={t('chats.quickSearch')}
              autoFocus
            />
            <button type="button" onClick={() => setQuickOpen(false)} aria-label={t('chats.close')}>
              <IonIcon icon={closeOutline} />
            </button>
          </div>
          <div className="chat-quick-sheet__list">
            {quickLoading ? (
              <p className="chat-quick-sheet__empty">{t('chats.quickLoading')}</p>
            ) : filteredQuick.length === 0 ? (
              <p className="chat-quick-sheet__empty">{t('chats.quickEmpty')}</p>
            ) : (
              filteredQuick.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="chat-quick-sheet__item"
                  onClick={() => onSelectQuick(item)}
                >
                  <div>
                    <strong>/{item.shortcut}</strong>
                    <p>{item.text}</p>
                  </div>
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt="" className="chat-quick-sheet__thumb" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {filePreview ? (
        <div className="chat-attach-preview">
          <button
            type="button"
            className="chat-attach-preview__close"
            onClick={() => setFilePreview(null)}
            aria-label={t('chats.close')}
          >
            <IonIcon icon={closeOutline} />
          </button>
          {filePreview.isImage ? (
            <img src={filePreview.url} alt="" className="chat-attach-preview__img" />
          ) : (
            <p className="chat-attach-preview__doc">{filePreview.file.name}</p>
          )}
          <input
            className="chat-attach-preview__caption"
            value={fileCaption}
            onChange={(e) => setFileCaption(e.target.value)}
            placeholder={t('chats.captionPlaceholder')}
          />
          <button
            type="button"
            className="chat-attach-preview__send"
            disabled={busy}
            onClick={onSendFilePreview}
          >
            {busy ? <IonSpinner name="crescent" /> : t('chats.send')}
          </button>
        </div>
      ) : null}

      {quickPreview ? (
        <div className="chat-attach-preview">
          <button
            type="button"
            className="chat-attach-preview__close"
            onClick={() => setQuickPreview(null)}
            aria-label={t('chats.close')}
          >
            <IonIcon icon={closeOutline} />
          </button>
          <div className="chat-attach-preview__thumbs">
            {quickPreview.images?.map((url) => (
              <img key={url} src={url} alt="" />
            ))}
          </div>
          <textarea
            className="chat-attach-preview__caption chat-attach-preview__caption--area"
            value={quickCaption}
            onChange={(e) => setQuickCaption(e.target.value)}
            rows={3}
          />
          <button
            type="button"
            className="chat-attach-preview__send"
            disabled={busy}
            onClick={onSendQuickPreview}
          >
            {busy ? <IonSpinner name="crescent" /> : t('chats.send')}
          </button>
        </div>
      ) : null}

      <div className={`chat-composer${isDisabled ? ' chat-composer--disabled' : ''}${draft.trim() ? ' chat-composer--typing' : ''}`}>
        <div className="chat-composer__tools">
          <button
            type="button"
            className="chat-composer__tool"
            disabled={isDisabled || busy || isRecording}
            aria-label={t('chats.emojiAria')}
            onClick={() => {
              setQuickOpen(false);
              setEmojiOpen((v) => !v);
            }}
          >
            <IonIcon icon={happyOutline} />
          </button>
          <button
            type="button"
            className="chat-composer__tool"
            disabled={isDisabled || busy || isRecording}
            aria-label={t('chats.attachAria')}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <IonSpinner name="crescent" /> : <IonIcon icon={attachOutline} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
            hidden
            onChange={(e) => void onPickFile(e)}
          />
        </div>

        <textarea
          ref={textareaRef}
          className="chat-composer__input"
          value={draft}
          rows={1}
          placeholder={isTablet ? t('chats.placeholder') : t('chats.messagePlaceholder')}
          disabled={isDisabled || busy || isRecording || Boolean(filePreview) || Boolean(quickPreview)}
          onChange={(e) => {
            const value = e.target.value;
            setDraft(value);
            if (value.startsWith('/')) {
              setQuickOpen(true);
              setQuickSearch(value.slice(1));
              setEmojiOpen(false);
            } else if (!value.trim()) {
              setQuickSearch('');
            }
            resizeTextarea();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && quickOpen) {
              e.preventDefault();
              setQuickOpen(false);
              return;
            }
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
              e.preventDefault();
              onSendText();
            }
          }}
        />

        <div className="chat-composer__actions">
          <button
            type="button"
            className="chat-composer__tool chat-composer__tool--quick"
            disabled={isDisabled || busy || isRecording}
            aria-label={t('chats.quickAria')}
            title={t('chats.quickAria')}
            onClick={() => {
              setEmojiOpen(false);
              setQuickOpen((v) => !v);
              if (!quickOpen) setQuickSearch(draft.startsWith('/') ? draft.slice(1) : '');
            }}
          >
            <IonIcon icon={flashOutline} />
          </button>

          {showSend ? (
            <button
              type="button"
              className="chat-composer__send"
              disabled={isDisabled || busy || !draft.trim()}
              aria-label={t('chats.send')}
              onClick={onSendText}
            >
              {sending ? <IonSpinner name="crescent" /> : <IonIcon icon={sendOutline} />}
            </button>
          ) : (
            <button
              type="button"
              className={`chat-composer__tool chat-composer__tool--mic${isRecording ? ' chat-composer__tool--recording' : ''}`}
              disabled={isDisabled || busy}
              aria-label={t(isRecording ? 'chats.stopRecording' : 'chats.recordAudio')}
              onClick={() => {
                if (isRecording) {
                  stopRecording();
                } else {
                  void startRecording();
                }
              }}
            >
              {isRecording ? <IonSpinner name="crescent" /> : <IonIcon icon={micOutline} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
