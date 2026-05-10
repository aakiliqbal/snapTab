import { FormEvent } from "react";
import { searchProviders, type SearchProviderId } from "../../../domain/tabState";
import type { SearchWidgetSettings } from "../../../domain/canvas";

type SearchWidgetProps = {
  activeProvider: (typeof searchProviders)[SearchProviderId];
  query: string;
  settings: SearchWidgetSettings;
  setQuery: (query: string) => void;
  changeSearchProvider: (providerId: SearchProviderId) => void;
};

export function SearchWidget({ activeProvider, changeSearchProvider, query, setQuery, settings }: SearchWidgetProps) {
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    window.location.href = `${activeProvider.url}${encodeURIComponent(trimmedQuery)}`;
  }

  return (
    <section className="search-panel">
      {settings.showProviderTabs ? (
        <div className="search-tabs" role="tablist" aria-label="Search provider">
          {Object.entries(searchProviders).map(([id, provider]) => (
            <button
              className={id === settings.searchProvider ? "active" : ""}
              key={id}
              onClick={() => void changeSearchProvider(id as SearchProviderId)}
              type="button"
            >
              {provider.label}
            </button>
          ))}
        </div>
      ) : null}

      <form className="search-box" onSubmit={submitSearch}>
        {settings.showSearchMark ? <span className="search-mark">{activeProvider.label.slice(0, 1)}</span> : null}
        <input
          aria-label={`Search with ${activeProvider.label}`}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Enter search"
          value={query}
        />
      </form>
    </section>
  );
}
