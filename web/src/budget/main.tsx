import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BudgetApp } from "./BudgetApp";
import "../index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <BudgetApp />
    </StrictMode>
  );
}
