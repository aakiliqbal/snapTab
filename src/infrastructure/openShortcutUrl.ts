export function openShortcutUrl(url: string) {
  const tabs = typeof chrome !== "undefined" ? chrome.tabs : undefined;
  const runtime = typeof chrome !== "undefined" ? chrome.runtime : undefined;

  if (!tabs?.create) {
    window.location.assign(url);
    return;
  }

  tabs.create({ url, active: true }, (createdTab) => {
    const getCurrent = tabs.getCurrent;
    const remove = tabs.remove;
    if (runtime?.lastError || !createdTab?.id || !getCurrent || !remove) {
      return;
    }

    getCurrent((currentTab) => {
      if (runtime?.lastError || !currentTab?.id || currentTab.id === createdTab.id) {
        return;
      }

      remove(currentTab.id);
    });
  });
}
