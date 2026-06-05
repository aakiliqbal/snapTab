chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "SNAPTAB_FETCH_RSS_FEED" || typeof message.url !== "string") {
    return false;
  }

  fetch(message.url)
    .then(async (response) => {
      sendResponse({
        ok: response.ok,
        status: response.status,
        text: await response.text()
      });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : "Feed unavailable."
      });
    });

  return true;
});
