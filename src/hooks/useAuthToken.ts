import { useEffect, useState } from 'react';
import { getAuthToken, onAuthTokenChanged } from '../utils/authSession';

export function useAuthToken(): string | null {
  const [token, setToken] = useState(getAuthToken);

  useEffect(() => onAuthTokenChanged(setToken), []);

  return token;
}
