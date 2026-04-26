import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "nprogress/nprogress.css";

// Hide the body initially to prevent FOUC
document.body.style.opacity = '0';
document.body.style.transition = 'opacity 0.3s ease-in-out';

// Show the body when everything is ready
window.addEventListener('load', () => {
  document.body.style.opacity = '1';
});

createRoot(document.getElementById("root")!).render(<App />);
