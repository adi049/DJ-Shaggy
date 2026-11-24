import { Component, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err?.message || 'Unexpected error' };
  }

  componentDidCatch(err: Error) {
    // Console-only: no PII is sent anywhere.
    console.error('[ui] render error:', err.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
          <p className="font-display text-2xl font-bold gold-text">Something went off-beat</p>
          <p className="mt-3 text-sm text-muted">This section hit an unexpected error. Your cart and orders are safe.</p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload(); }}
              className="rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-ink hover:bg-gold-soft"
            >
              Reload page
            </button>
            <Link to="/" className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-silver hover:border-gold/50">
              Go home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
