# Top-Level Tile Order

SnapTab stores Shortcut and Folder records separately, but the New Tab Surface needs one user-arrangeable sequence that can mix both kinds of tiles across Shortcut Pages. We will add an explicit ordered list of Top-Level Tile references instead of merging Shortcut and Folder data into one union array, so each record type keeps its existing shape while display order, pagination, and drag reorder share one source of truth.

Existing state and backups that do not include this ordered list migrate to the previous visual order: Shortcuts first, then Folders. Creation tiles are not persisted in the ordered list; the UI appends them after user tiles.
