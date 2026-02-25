import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
// Note: StrictMode temporarily disabled due to React Three Fiber compatibility issues
// See: https://github.com/pmndrs/react-three-fiber/issues
root.render(
  <App />,
);
