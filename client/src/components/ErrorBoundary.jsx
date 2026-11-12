import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught rendering error:', error, errorInfo);
  }

  handleRecover = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="card status-card status-card--error" role="alert">
          <h2 className="status-title">Something went wrong displaying this study material</h2>
          <p className="status-description">
            A rendering error occurred in the interface ({this.state.errorMessage}). You can reset
            the view and try generating again.
          </p>
          <div className="status-actions">
            <button type="button" className="btn btn-primary" onClick={this.handleRecover}>
              Reset View
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

