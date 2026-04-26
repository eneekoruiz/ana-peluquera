import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({
  error,
  resetError
}) => (
  <main className="pt-16 min-h-screen flex items-center justify-center">
    <div className="container max-w-md text-center space-y-6">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <AlertTriangle size={32} className="text-red-600" />
      </div>

      <div className="space-y-2">
        <h1 className="font-serif text-2xl text-foreground">
          Error de conexión
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ha ocurrido un problema al cargar la página. Por favor, revisa tu conexión a internet e inténtalo de nuevo.
        </p>
      </div>

      {process.env.NODE_ENV === 'development' && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
          <p className="text-xs font-mono text-red-800 break-all">
            {error.message}
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button onClick={resetError} className="gap-2">
          <RefreshCw size={16} />
          Reintentar
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Ir al inicio
        </Button>
      </div>
    </div>
  </main>
);

export default ErrorBoundary;