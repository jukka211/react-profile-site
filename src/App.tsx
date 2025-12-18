// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { ContentProvider } from "./content/useContent";
import AudioDrawPage from "./pages/AudioDrawPage";
import DrawPage from "./pages/DrawPage"; // ✅ add this

export default function App() {
  return (
    <ContentProvider>
      <Routes>
        <Route path="/" element={<AudioDrawPage />} />
        <Route path="/draw" element={<DrawPage />} /> {/* ✅ add this */}

        {/* keep this last */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ContentProvider>
  );
}
