import React from "react";

export default class DebugBoundary extends React.Component<
  { children: React.ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(err: Error, info: any) { console.error("Caught by DebugBoundary:", err, info); }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "ui-sans-serif", color: "#111" }}>
          <h2>💥 A runtime error occurred</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error.stack || this.state.error.message)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
