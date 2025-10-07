import { Routes, Route, Link, Navigate } from "react-router-dom";
import { ContentProvider } from "./content/useContent";
import HomePage from "./pages/HomePage";
import DrawPage from "./pages/DrawPage";
import AudioDrawPage from "./pages/AudioDrawPage";

export default function App() {
  return (
<ContentProvider>
  <nav className="top-nav">
    <button
      onClick={() => {
        const order = ["/draw", "/audio", "/"]; // your sequence
        const current = window.location.pathname;
        const idx = order.indexOf(current);
        const next = order[(idx + 1) % order.length];
        window.location.href = next;
      }}
      className="reload-btn"
      title="Next page"
    >
      🔄
    </button>
  </nav>

  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/draw" element={<DrawPage />} />
    <Route path="/audio" element={<AudioDrawPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
</ContentProvider>
  );
}
