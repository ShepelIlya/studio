// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PanelsState } from "@foxglove/studio-base/context/CurrentLayoutContext/actions";

// We use "brand" tags to prevent confusion between string types with distinct meanings
// https://github.com/microsoft/TypeScript/issues/4895
export type LayoutID = string & { __brand: "LayoutID" };
export type ISO8601Timestamp = string & { __brand: "ISO8601Timestamp" };

export type LayoutPermission = "creator_write" | "org_read" | "org_write";

export type LayoutSyncStatus =
  | "new"
  | "updated"
  | "tracked"
  | "locally-deleted"
  | "remotely-deleted";
export type Layout = {
  id: LayoutID;
  name: string;
  permission: LayoutPermission;

  /** @deprecated old field name, migrated to working/baseline */
  data?: PanelsState;
  /** @deprecated old field name, migrated to working/baseline */
  state?: PanelsState;

  /** The last explicitly saved version of this layout. */
  baseline: {
    data: PanelsState;
    savedAt: ISO8601Timestamp | undefined;
  };

  /**
   * The working copy of this layout, if it has been edited since the last explicit save.
   */
  working:
    | {
        data: PanelsState;
        savedAt: ISO8601Timestamp | undefined;
      }
    | undefined;

  /** Info about this layout from remote storage. */
  syncInfo:
    | {
        status: LayoutSyncStatus;
        /** The last savedAt time returned by the server. */
        lastRemoteSavedAt: ISO8601Timestamp | undefined;
      }
    | undefined;
};

export interface ILayoutStorage {
  list(namespace: string): Promise<readonly Layout[]>;
  get(namespace: string, id: LayoutID): Promise<Layout | undefined>;
  put(namespace: string, layout: Layout): Promise<Layout>;
  delete(namespace: string, id: LayoutID): Promise<void>;

  /**
   * If applicable, the layout manager will call this method to migrate any old existing local
   * layouts into the new namespace used for local layouts.
   */
  migrateLocalLayouts?(namespace: string): Promise<void>;
}

export function layoutPermissionIsShared(
  permission: LayoutPermission,
): permission is Exclude<LayoutPermission, "creator_write"> {
  return permission !== "creator_write";
}

export function layoutIsShared(
  layout: Layout,
): layout is Layout & { permission: Exclude<LayoutPermission, "creator_write"> } {
  return layoutPermissionIsShared(layout.permission);
}

export function layoutAppearsDeleted(layout: Layout): boolean {
  return (
    layout.syncInfo?.status === "locally-deleted" ||
    (layout.syncInfo?.status === "remotely-deleted" && layout.working == undefined)
  );
}

/**
 * Import a layout from storage, transferring old properties to the current expected format.
 *
 * Layouts created before we stored both working/baseline copies were stored with a "data" field;
 * migrate this to a baseline layout.
 */
export function migrateLayout(value: unknown): Layout {
  if (typeof value !== "object" || value == undefined) {
    throw new Error("Invariant violation - layout item is not an object");
  }
  const layout = value as Partial<Layout>;
  if (!("id" in layout) || !layout.id) {
    throw new Error("Invariant violation - layout item is missing an id");
  }

  const now = new Date().toISOString() as ISO8601Timestamp;

  let baseline = layout.baseline;
  if (!baseline) {
    if (layout.working) {
      baseline = layout.working;
    } else if (layout.data) {
      baseline = { data: layout.data, savedAt: now };
    } else if (layout.state) {
      baseline = { data: layout.state, savedAt: now };
    } else {
      throw new Error("Invariant violation - layout item is missing data");
    }
  }

  return {
    id: layout.id,
    name: layout.name ?? `Unnamed (${now})`,
    permission: layout.permission ?? "creator_write",
    working: layout.working,
    baseline,
    syncInfo: layout.syncInfo,
  };
}
