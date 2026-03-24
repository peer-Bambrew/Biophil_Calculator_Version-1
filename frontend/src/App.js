import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Calculator from "./pages/Calculator";
import Admin from "./pages/Admin";
import History from "./pages/History";
import Navigation from "./components/Navigation";

function App() {
  return (
    <div className="App min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Calculator />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
