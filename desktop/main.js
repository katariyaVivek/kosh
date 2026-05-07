const path = require("path");
const { app, BrowserWindow, Menu, Tray, shell, nativeImage } = require("electron");

const KOSH_WEB_URL = process.env.KOSH_WEB_URL || "http://localhost:3000";

let tray = null;
let panel = null;

function panelUrl() {
  return `${KOSH_WEB_URL}/tray`;
}

function createPanel() {
  panel = new BrowserWindow({
    width: 380,
    height: 560,
    resizable: false,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  panel.on("blur", () => {
    if (panel && panel.isVisible()) {
      panel.hide();
    }
  });

  panel.loadURL(panelUrl()).catch(() => {
    panel.loadURL("data:text/html,<h3>Kosh tray panel unavailable. Start Kosh web app on localhost:3000.</h3>");
  });
}

function togglePanel() {
  if (!panel) {
    return;
  }

  if (panel.isVisible()) {
    panel.hide();
    return;
  }

  const trayBounds = tray.getBounds();
  const panelBounds = panel.getBounds();
  const x = Math.round(trayBounds.x - panelBounds.width / 2 + trayBounds.width / 2);
  const y = Math.round(trayBounds.y - panelBounds.height - 8);
  panel.setPosition(Math.max(0, x), Math.max(0, y), false);
  panel.show();
  panel.focus();
}

function createTray() {
  const iconPath = path.join(__dirname, "..", "public", "branding", "kosh-mark.png");
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  tray = new Tray(icon);
  tray.setToolTip("Kosh Tray");

  const menu = Menu.buildFromTemplate([
    {
      label: "Open Dashboard",
      click: () => shell.openExternal(KOSH_WEB_URL),
    },
    {
      label: "Open Tray Panel",
      click: () => togglePanel(),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(menu);
  tray.on("click", () => togglePanel());
}

app.whenReady().then(() => {
  createPanel();
  createTray();
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});
