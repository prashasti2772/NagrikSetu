import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { validateProductionApiBase } from "./src/services/apiBase.js";

export default defineConfig(({ command, mode }) => {
  if (command === "build" && mode === "production") {
    validateProductionApiBase(loadEnv(mode, process.cwd(), "VITE_").VITE_API_BASE_URL);
  }
  return { plugins: [react(), tailwindcss()] };
});
