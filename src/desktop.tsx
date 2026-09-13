import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MobileDeviceProvider } from "./mobile/Device";
import { KeyboardProvider } from "./mobile";
import { KakiApp } from "./Prototype";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MobileDeviceProvider>
      <KeyboardProvider>
        <KakiApp desktop />
      </KeyboardProvider>
    </MobileDeviceProvider>
  </StrictMode>,
);
