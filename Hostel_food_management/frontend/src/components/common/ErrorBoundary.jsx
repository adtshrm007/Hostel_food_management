import React from 'react';
import OfflinePage from './OfflinePage';

/**
 * ErrorBoundary — catches React rendering errors, with special handling for
 * network / chunk-load failures that occur when the user is offline.
 *
 * Detected error patterns:
 *  - "Failed to fetch dynamically imported module"  (Chrome/Edge)
 *  - "error loading dynamically imported module"    (Firefox)
 *  - "Importing a module script failed"             (Safari)
 *  - ChunkLoadError (Webpack / Vite chunk names)
 */

function isNetworkOrChunkError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    name.includes('chunkloaderror') ||
    // Generic network failure while fetching JS
    (msg.includes('failed to fetch') && msg.includes('.js'))
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      isOfflineError: false,
      error: null,
    };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    const isOfflineError = isNetworkOrChunkError(error);
    return { hasError: true, isOfflineError, error };
  }

  componentDidCatch(error, info) {
    if (!isNetworkOrChunkError(error)) {
      console.error('[ErrorBoundary] Unhandled rendering error:', error, info);
    }
  }

  handleRetry() {
    this.setState({ hasError: false, isOfflineError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <OfflinePage
          isOfflineError={this.state.isOfflineError}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
