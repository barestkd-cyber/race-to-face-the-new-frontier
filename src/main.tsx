import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, ScreenError } from './App';
import { store } from './state/store';
import './ui/theme.css';

/**
 * A render failure must never take the run with it. The engine state lives in
 * the store, outside React, so recovering is a matter of resetting the screen.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ScreenError
          error={this.state.error}
          onReset={() => {
            if (store.state) store.setScreen('cockpit');
            this.setState({ error: null });
          }}
        />
      );
    }
    return this.props.children;
  }
}

// Dev-only handle so the running game can be poked from the console during
// playtesting. Stripped from production builds.
if (import.meta.env.DEV) {
  (window as unknown as { game: typeof store }).game = store;
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element missing');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
