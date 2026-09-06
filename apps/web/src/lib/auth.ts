export type UserAccess = {
  role: string;
  permissions: string[];
  pages: string[];
};

const userAccessMap: Record<string, UserAccess> = {
  'super-admin': {
    role: 'Super Admin',
    permissions: ['view', 'create', 'edit', 'delete'],
    pages: ['dashboard', 'products', 'sales', 'purchases', 'billing', 'users', 'settings'],
  },
  admin: {
    role: 'Admin',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'products', 'sales', 'purchases', 'billing', 'users'],
  },
  'inventory-manager': {
    role: 'Inventory Manager',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'products', 'purchases', 'stock'],
  },
  'sales-manager': {
    role: 'Sales Manager',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'sales', 'customers', 'invoices'],
  },
  'accounts-manager': {
    role: 'Accounts Manager',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'billing', 'invoices', 'reports'],
  },
  'purchase-manager': {
    role: 'Purchase Manager',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'purchases', 'suppliers', 'inventory'],
  },
  viewer: {
    role: 'Viewer',
    permissions: ['view'],
    pages: ['dashboard', 'reports'],
  },
};

export function getUserAccess(role: string): UserAccess {
  return userAccessMap[role] ?? userAccessMap.viewer;
}

export function canUserAccessPage(role: string, page: string): boolean {
  return getUserAccess(role).pages.includes(page);
}
