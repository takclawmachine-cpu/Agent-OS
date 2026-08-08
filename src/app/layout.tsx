import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { ProjectPanelProvider } from "@/components/project-panel-provider";
import { ReliabilityProvider } from "@/components/reliability-provider";
import { RealtimeProvider } from "@/components/realtime-provider";
import { UndoProvider } from "@/components/undo-provider";

import "../../design-system/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent OS | Local Command",
  description: "Voice-first local command center for Hermes and project agents.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body data-role="admin" data-voice-state="idle">
        <ReliabilityProvider>
          <RealtimeProvider>
            <UndoProvider>
              <AuthGate>
                <ProjectPanelProvider>
                  <AppShell>{children}</AppShell>
                </ProjectPanelProvider>
              </AuthGate>
            </UndoProvider>
          </RealtimeProvider>
        </ReliabilityProvider>
      </body>
    </html>
  );
}
