import React from "react";
import ReactDOM from "react-dom/client";
import Simulator from "./App.jsx";
import HataSiniri from "./components/HataSiniri.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HataSiniri>
      <Simulator />
    </HataSiniri>
  </React.StrictMode>
);
