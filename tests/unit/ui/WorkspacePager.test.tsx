import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedWorkspaceItem } from "../../../src/domain/workspaceItemModel";
import { WorkspacePager } from "../../../src/ui/workspace/WorkspacePager";
import type { WorkspaceItemRenderers } from "../../../src/ui/workspace/WorkspaceItemRenderer";

const placement = { column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 };
const shortcut = (id: string, title: string): ResolvedWorkspaceItem => ({
  kind: "shortcut",
  id: `tile:${id}`,
  tileId: id,
  tile: {
    kind: "shortcut",
    id,
    title,
    url: "https://example.com",
    icon: { type: "fallback", label: title.slice(0, 1), background: "#123456" }
  },
  placement
});

const renderers: WorkspaceItemRenderers = {
  renderWidget: () => <span>widget</span>,
  renderShortcut: (item) => <span>{item.tile.title}</span>,
  renderFolder: () => <span>folder</span>
};

describe("WorkspacePager", () => {
  it("renders the first page and disables previous navigation at the start", () => {
    const markup = renderToStaticMarkup(
      <WorkspacePager
        pages={[
          { id: "home", label: "Home", items: [shortcut("docs", "Docs")] },
          { id: "work", label: "Work", items: [shortcut("mail", "Mail")] }
        ]}
        columns={6}
        rows={4}
        editMode={false}
        renderers={renderers}
      />
    );

    expect(markup).toContain('aria-label="Workspace pages"');
    expect(markup).toContain("Home (1 of 2)");
    expect(markup).toContain("Docs");
    expect(markup).toMatch(/<button[^>]*aria-label="Previous workspace page"[^>]*disabled=""/);
    expect(markup).toContain('aria-label="Next workspace page"');
    expect(markup).not.toContain("Mail");
  });

  it("honors a controlled active page and reports a clear page indicator", () => {
    const onActivePageChange = vi.fn();
    const markup = renderToStaticMarkup(
      <WorkspacePager
        pages={[
          { id: "home", items: [shortcut("docs", "Docs")] },
          { id: "work", items: [shortcut("mail", "Mail")] }
        ]}
        activePageId="work"
        columns={6}
        rows={4}
        editMode={true}
        renderers={renderers}
        onActivePageChange={onActivePageChange}
      />
    );

    expect(markup).toContain("work (2 of 2)");
    expect(markup).toContain("Mail");
    expect(markup).not.toContain("Docs");
    expect(markup).toContain("workspace-page-surface editing");
    expect(onActivePageChange).not.toHaveBeenCalled();
  });

  it("recovers to the first available page when the active page ID is stale", () => {
    const markup = renderToStaticMarkup(
      <WorkspacePager
        pages={[
          { id: "home", label: "Home", items: [shortcut("docs", "Docs")] },
          { id: "work", label: "Work", items: [shortcut("mail", "Mail")] }
        ]}
        activePageId="removed-page"
        columns={6}
        rows={4}
        editMode={false}
        renderers={renderers}
      />
    );

    expect(markup).toContain('data-workspace-active-page="home"');
    expect(markup).toContain("Home (1 of 2)");
    expect(markup).toContain("Docs");
    expect(markup).not.toContain("Mail");
  });

  it("disables both navigation controls when there is only one page", () => {
    const markup = renderToStaticMarkup(
      <WorkspacePager
        pages={[{ id: "home", label: "Home", items: [shortcut("docs", "Docs")] }]}
        columns={6}
        rows={4}
        editMode={false}
        renderers={renderers}
      />
    );

    expect(markup).toMatch(/<button[^>]*aria-label="Previous workspace page"[^>]*disabled=""/);
    expect(markup).toMatch(/<button[^>]*aria-label="Next workspace page"[^>]*disabled=""/);
  });

  it("renders a safe empty state for a layout without pages", () => {
    const markup = renderToStaticMarkup(
      <WorkspacePager pages={[]} columns={6} rows={4} editMode={false} renderers={renderers} />
    );
    expect(markup).toContain("No workspace pages");
  });
});
