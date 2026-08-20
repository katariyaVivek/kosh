import type { ReactNode } from "react";
import { KoshShell } from "@/components/kosh-shell";
import { RuntimeI18nProvider } from "@/src/i18n/RuntimeI18nProvider";
import { DashboardLayout } from "@/src/shared/components";
import "@/src/lib/network/initOutboundProxy";
import "@/src/shared/services/bootstrap";
import { initConsoleLogCapture } from "@/src/lib/consoleLogBuffer";

initConsoleLogCapture();

export default function GatewayLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <KoshShell>
      <RuntimeI18nProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </RuntimeI18nProvider>
    </KoshShell>
  );
}
