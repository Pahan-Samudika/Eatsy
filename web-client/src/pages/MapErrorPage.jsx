import React from 'react';

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Map component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-error/10 p-4 rounded-lg">
          <h3 className="font-bold text-error mb-2">Map Error</h3>
          <p className="mb-2">
            There was a problem loading the map. The error was: 
            {this.state.error?.message || "Unknown error"}
          </p>
          <button 
            className="btn btn-sm btn-error" 
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
