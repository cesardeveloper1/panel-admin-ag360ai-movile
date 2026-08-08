/**
 * Extrae el payload útil de respuestas StdApiResponse / ResponseInterceptor.
 * Formas comunes: { data }, { data: { data } }, array directo.
 */
export function unwrapApiPayload<T>(response: unknown): T {
  if (response === null || response === undefined) {
    return null as T;
  }
  if (typeof response !== 'object') {
    return response as T;
  }

  const r = response as Record<string, unknown>;

  if (r.success === false || r.type === 'ERROR') {
    const message =
      (typeof r.message === 'string' && r.message) ||
      'Error del servidor';
    throw { message, statusCode: r.statusCode ?? 500, type: r.type };
  }

  const outer = r.data;
  if (outer === undefined) {
    return response as T;
  }

  if (typeof outer === 'object' && outer !== null && !Array.isArray(outer)) {
    const o = outer as Record<string, unknown>;
    if (o.type === 'ERROR') {
      throw {
        message: typeof o.message === 'string' ? o.message : 'Error del servidor',
        statusCode: o.statusCode ?? 500,
        type: o.type,
      };
    }
    if ('data' in o && o.data !== undefined) {
      return o.data as T;
    }
  }

  return outer as T;
}

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  return [value as T];
}
