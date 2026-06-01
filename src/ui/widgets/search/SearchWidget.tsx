import type { FormEvent, MouseEvent } from "react";
import { siDuckduckgo, siGoogle, type SimpleIcon } from "simple-icons";
import { buildSearchUrl, searchVerticals, type SearchProviderId, type SearchVerticalId } from "../../../domain/tabState";
import type { SearchWidgetSettings } from "../../../domain/canvas";

type SearchWidgetProps = {
  activeProvider: { label: string };
  query: string;
  settings: SearchWidgetSettings;
  setQuery: (query: string) => void;
  changeSearchVertical: (verticalId: SearchVerticalId) => void;
};

type ProviderMark =
  | { type: "icon"; icon: SimpleIcon }
  | { type: "image"; src: string };

const providerMarks: Record<SearchProviderId, ProviderMark> = {
  google: { type: "icon", icon: siGoogle },
  bing: { type: "image", src: "https://www.bing.com/favicon.ico" },
  yahoo: { type: "image", src: "https://www.yahoo.com/favicon.ico" },
  yandex: { type: "image", src: "https://yandex.com/favicon.ico" },
  duckduckgo: { type: "icon", icon: siDuckduckgo }
};

export function SearchWidget({ activeProvider, changeSearchVertical, query, setQuery, settings }: SearchWidgetProps) {
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    window.location.href = buildSearchUrl(settings.searchProvider, settings.searchVertical, trimmedQuery);
  }

  function selectVertical(event: MouseEvent<HTMLButtonElement>) {
    const verticalId = event.currentTarget.dataset.verticalId as SearchVerticalId;
    changeSearchVertical(verticalId);
  }

  return (
    <section className="search-panel">
      {settings.showProviderTabs ? (
        <div className="search-tabs" role="tablist" aria-label={`${activeProvider.label} search category`}>
          {Object.entries(searchVerticals).map(([id, vertical]) => (
            <button
              aria-selected={id === settings.searchVertical}
              className={id === settings.searchVertical ? "active" : ""}
              data-vertical-id={id}
              key={id}
              onClick={selectVertical}
              role="tab"
              type="button"
            >
              {vertical.label}
            </button>
          ))}
        </div>
      ) : null}

      <form className="search-box" onSubmit={submitSearch}>
        {settings.showSearchMark ? <ProviderBrandMark providerId={settings.searchProvider} providerLabel={activeProvider.label} /> : null}
        <input
          aria-label={`Search ${searchVerticals[settings.searchVertical].label} with ${activeProvider.label}`}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Enter search"
          value={query}
        />
      </form>
    </section>
  );
}

function ProviderBrandMark({ providerId, providerLabel }: { providerId: SearchProviderId; providerLabel: string }) {
  const mark = providerMarks[providerId];

  if (mark.type === "icon") {
    return (
      <span className="search-mark provider-icon" aria-label={providerLabel} role="img">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d={mark.icon.path} fill={`#${mark.icon.hex}`} />
        </svg>
      </span>
    );
  }

  return (
    <span className="search-mark provider-image" aria-label={providerLabel} role="img">
      <img alt="" src={mark.src} />
    </span>
  );
}
