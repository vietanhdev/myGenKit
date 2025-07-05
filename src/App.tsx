import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.scss";
import { HeroUIProviderWrapper } from "./components/providers/hero-ui-provider";
import { LoginPage } from "./pages/LoginPage";
import { MainApp } from "./pages/MainApp";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

function App() {
  return (
    <HeroUIProviderWrapper>
      <div className="App">
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <MainApp />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
      </div>
    </HeroUIProviderWrapper>
  );
}

export default App;
