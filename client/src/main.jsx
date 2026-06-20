// =============================================
// FILE: main.jsx — The starting point of our React app
// =============================================
// This is the first file that runs when you open
// the app in your browser. It loads React and
// puts our App component on the screen.

// ---------- 1. IMPORTS ----------
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ---------- 2. FIND THE ROOT ELEMENT ----------
// In index.html, there's a <div id="root"></div>.
// React will put everything inside that div.
const rootElement = document.getElementById("root");

// ---------- 3. RENDER THE APP ----------
// Create a React root and show our App component
ReactDOM.createRoot(rootElement).render(
  // StrictMode helps catch bugs during development
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
