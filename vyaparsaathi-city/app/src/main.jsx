import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "@fontsource-variable/geist";
import "./styles.css";
import "./design.css";
import "./mission.css";
import "./finance.css";
import "./zomato.css";
import "./marketplace.css";
import "./app-frame.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

if(import.meta.env.PROD && 'serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}
