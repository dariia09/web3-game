import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";
import "./game-experience.css";
import "./casino-premium.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
