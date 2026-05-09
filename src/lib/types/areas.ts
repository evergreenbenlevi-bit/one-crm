// Areas + Folders types — Phase 1 sidebar redesign

export interface Area {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string;
  position: number;
  is_active: boolean;
  created_at: string;
  folders?: Folder[];
}

export interface Folder {
  id: string;
  area_id: string;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  href: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AreaWithFolders extends Area {
  folders: Folder[];
}

export interface CreateAreaPayload {
  name: string;
  slug: string;
  icon?: string | null;
  color?: string;
  position?: number;
}

export interface UpdateAreaPayload {
  name?: string;
  icon?: string | null;
  color?: string;
  position?: number;
  is_active?: boolean;
}

export interface CreateFolderPayload {
  area_id: string;
  name: string;
  slug: string;
  icon?: string | null;
  href?: string | null;
  position?: number;
}

export interface UpdateFolderPayload {
  name?: string;
  icon?: string | null;
  href?: string | null;
  position?: number;
  is_active?: boolean;
}
