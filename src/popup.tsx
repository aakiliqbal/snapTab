import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./ui/popup";
import "./ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
