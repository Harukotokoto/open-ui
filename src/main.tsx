import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { ThemeProvider } from "@/components/common/theme-provider";
import "@/styles/globals.css";

// 通信先はローカルのRust側(IPC)なので、ネットワークが切れていても止めない
// (既定の "online" だと、オフライン判定のあいだ読み書きが保留される)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: "always" },
    mutations: { networkMode: "always" },
  },
});

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root が見つかりません");
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
