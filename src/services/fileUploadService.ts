import { config } from '../config/env';
import { getAuthToken } from '../utils/authSession';

async function postFormData(url: string, formData: FormData): Promise<Record<string, unknown>> {
  const token = getAuthToken();
  const response = await fetch(`${config.apiBaseUrl}${url}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    credentials: 'include',
  });

  const responseData = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw {
      message:
        (typeof responseData.message === 'string' && responseData.message) ||
        `Error del servidor: ${response.status}`,
      statusCode: response.status,
      data: responseData.data,
    };
  }
  return responseData;
}

function extractUploadUrl(response: Record<string, unknown>): string {
  const data = response.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data && typeof data === 'object') {
    const url = (data as { url?: string }).url;
    if (typeof url === 'string' && url.trim()) return url.trim();
  }
  if (typeof response.url === 'string' && response.url.trim()) return response.url.trim();
  throw new Error('No se pudo obtener la URL del archivo subido');
}

function extractBrandLogoUrl(response: Record<string, unknown>): string {
  const data = response.data;
  if (data && typeof data === 'object') {
    const logo = (data as { logo?: unknown }).logo;
    if (typeof logo === 'string' && logo.trim()) return logo.trim();
  }
  return extractUploadUrl(response);
}

/** Subida de archivos para chats (imagen, PDF, audio). */
export const fileUploadService = {
  async uploadBrandLogo(file: File, brandId: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await postFormData(`/brand/${encodeURIComponent(brandId)}/logo`, formData);
    return extractBrandLogoUrl(response);
  },

  async uploadImage(file: File, brandId: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await postFormData(
      `/chats/upload-image/${encodeURIComponent(brandId)}`,
      formData,
    );
    return extractUploadUrl(response);
  },

  async uploadPdf(file: File, brandId: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await postFormData(
      `/files/upload/${encodeURIComponent(brandId)}`,
      formData,
    );
    return extractUploadUrl(response);
  },

  async uploadAudio(file: File, brandId: string): Promise<string> {
    const formData = new FormData();
    formData.append('audio', file);
    const response = await postFormData(
      `/chats/upload-audio/${encodeURIComponent(brandId)}`,
      formData,
    );
    return extractUploadUrl(response);
  },
};
