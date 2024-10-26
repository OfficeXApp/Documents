import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import DocumentEditor from "./DocumentEditor";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to a new document */}
        <Route
          path="/"
          element={<Navigate to={`/doc/${uuidv4()}`} replace />}
        />

        {/* Handle document routes */}
        <Route path="/doc/:docId" element={<DocumentEditor />} />

        {/* Catch all other routes and redirect to new document */}
        <Route
          path="*"
          element={<Navigate to={`/doc/${uuidv4()}`} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
