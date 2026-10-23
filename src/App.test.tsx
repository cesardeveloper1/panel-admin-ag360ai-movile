import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
import { vi } from 'vitest';
import { apiFacade } from './services/apiFacade';

test('renders without crashing', () => {
  // This smoke test must not restore a real session against the configured API.
  const restore = vi.spyOn(apiFacade, 'restoreSession').mockResolvedValue(null);
  const { baseElement } = render(<App />);
  expect(baseElement).toBeDefined();
  restore.mockRestore();
});
