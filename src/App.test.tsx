import React from 'react';
import { render, cleanup } from '@testing-library/react';
import App from './App';
import { afterEach, vi } from 'vitest';
import './i18n';
import { apiFacade } from './services/apiFacade';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('renders without crashing', () => {
  // This smoke test must not restore a real session against the configured API.
  vi.spyOn(apiFacade, 'restoreSession').mockResolvedValue(null);
  const { baseElement } = render(<App />);
  expect(baseElement).toBeDefined();

});
