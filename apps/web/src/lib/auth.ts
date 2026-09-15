export type UserAccess = {
  role: string;
  permissions: string[];
  pages: string[];
};

const userAccessMap: Record<string, UserAccess> = {
  'super-admin': {
    role: 'Super Admin',
    permissions: ['view', 'create', 'edit', 'delete'],
    pages: ['dashboard', 'products', 'product-rates', 'sales', 'purchases', 'purchase-orders', 'billing', 'customers', 'users', 'settings', 'reports'],
  },
  admin: {
    role: 'Admin',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'products', 'product-rates', 'sales', 'purchases', 'purchase-orders', 'billing', 'customers', 'users', 'reports'],
  },
  'inventory-manager': {
    role: 'Inventory Manager',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'products', 'product-rates', 'purchases', 'purchase-orders', 'stock'],
  },
  'sales-manager': {
    role: 'Sales Manager',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'sales', 'product-rates', 'customers', 'billing', 'invoices'],
  },
  'accounts-manager': {
    role: 'Accounts Manager',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'billing', 'product-rates', 'invoices', 'reports'],
  },
  'purchase-manager': {
    role: 'Purchase Manager',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'purchases', 'purchase-orders', 'product-rates', 'suppliers', 'inventory'],
  },
  manager: {
    role: 'Manager',
    permissions: ['view', 'create', 'edit'],
    pages: ['dashboard', 'purchases', 'purchase-orders', 'billing', 'reports'],
  },
  supervisor: {
    role: 'Supervisor',
    permissions: ['view', 'edit'],
    pages: ['dashboard', 'purchase-orders', 'billing', 'reports'],
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
