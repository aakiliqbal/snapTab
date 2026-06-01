import type { BrandIconId } from "./brandIcons";

export type ShortcutDraft = {
  id: string | null;
  folderId: string | null;
  title: string;
  url: string;
  iconLabel: string;
  iconBackground: string;
  iconImageDataUrl: string | null;
  iconMediaId: string | null;
  brandIconId: BrandIconId | null;
};

export type FolderEditDraft = {
  id: string;
  title: string;
  iconLabel: string;
  iconBackground: string;
};

export const emptyShortcutDraft: ShortcutDraft = {
  id: null,
  folderId: null,
  title: "",
  url: "",
  iconLabel: "",
  iconBackground: "#2d8cff",
  iconImageDataUrl: null,
  iconMediaId: null,
  brandIconId: null
};
