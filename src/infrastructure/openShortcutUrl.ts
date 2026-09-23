export function openShortcutUrl(url: string) {
  const tabs = typeof chrome !== "undefined" ? chrome.tabs : undefined;

  if (!tabs?.create) {
    window.location.assign(url);
    return;
  }

  tabs.create({ url, active: true });
}
