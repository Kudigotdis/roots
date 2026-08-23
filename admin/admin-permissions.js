/* ============================================================
   ROOTS ADMINISTRATOR — permissions engine (Setup 3 §5-7, §55).
   Central permission map + hasAdminPermission(). No scattered
   role checks anywhere in the UI code.
   ============================================================ */
(function () {
  'use strict';

  var ROOTS_ADMIN_ROLES = {
    SUPER_ADMIN: 'Super Administrator',
    INSTITUTION_ADMIN: 'Institution Administrator',
    DATA_ADMIN: 'Data Administrator',
    CULTURAL_EDITOR: 'Cultural Editor',
    FINANCE_ADMIN: 'Finance Administrator',
    SUPPORT_ADMIN: 'Support Administrator',
    AUDITOR: 'Auditor'
  };

  var ROOTS_ADMIN_PERMISSIONS = {
    DASHBOARD_VIEW: 'admin.dashboard.view',

    INSTITUTIONS_READ: 'admin.institutions.read',
    INSTITUTIONS_CREATE: 'admin.institutions.create',
    INSTITUTIONS_EDIT: 'admin.institutions.edit',
    INSTITUTIONS_SUSPEND: 'admin.institutions.suspend',

    APPLICATIONS_READ: 'admin.applications.read',
    APPLICATIONS_REVIEW: 'admin.applications.review',
    APPLICATIONS_APPROVE: 'admin.applications.approve',
    APPLICATIONS_REJECT: 'admin.applications.reject',

    USERS_READ: 'admin.users.read',
    USERS_MANAGE: 'admin.users.manage',

    ACCESS_READ: 'admin.access.read',
    ACCESS_APPROVE: 'admin.access.approve',
    ACCESS_REVOKE: 'admin.access.revoke',

    PRODUCTS_READ: 'admin.products.read',
    PRODUCTS_MANAGE: 'admin.products.manage',

    SUBSCRIPTIONS_READ: 'admin.subscriptions.read',
    SUBSCRIPTIONS_MANAGE: 'admin.subscriptions.manage',

    DISPUTES_READ: 'admin.disputes.read',
    DISPUTES_RESOLVE: 'admin.disputes.resolve',

    IMPORTS_READ: 'admin.imports.read',
    IMPORTS_MANAGE: 'admin.imports.manage',

    EXPORTS_READ: 'admin.exports.read',
    EXPORTS_APPROVE: 'admin.exports.approve',

    AUDIT_READ: 'admin.audit.read',

    GEOGRAPHY_MANAGE: 'admin.geography.manage',
    SCHOOLS_MANAGE: 'admin.schools.manage',
    LIBRARY_MANAGE: 'admin.library.manage',

    SYSTEM_MANAGE: 'admin.system.manage'
  };
  var ALL = Object.keys(ROOTS_ADMIN_PERMISSIONS).map(function (k) { return ROOTS_ADMIN_PERMISSIONS[k]; });

  /* Role -> permission configuration (central; SUPER_ADMIN mapped to
     everything here rather than via if-checks around the app). */
  var ROLE_PERMISSIONS = {};
  ROLE_PERMISSIONS[ROOTS_ADMIN_ROLES.SUPER_ADMIN] = ALL.slice();
  ROLE_PERMISSIONS[ROOTS_ADMIN_ROLES.INSTITUTION_ADMIN] = [
    'admin.dashboard.view', 'admin.institutions.read', 'admin.institutions.edit',
    'admin.applications.read', 'admin.applications.review', 'admin.applications.approve', 'admin.applications.reject',
    'admin.users.read', 'admin.users.manage',
    'admin.access.read', 'admin.access.approve', 'admin.access.revoke',
    'admin.subscriptions.read', 'admin.exports.read', 'admin.audit.read'
  ];
  ROLE_PERMISSIONS[ROOTS_ADMIN_ROLES.DATA_ADMIN] = [
    'admin.dashboard.view', 'admin.institutions.read',
    'admin.users.read', 'admin.users.manage',
    'admin.access.read', 'admin.access.approve', 'admin.access.revoke',
    'admin.disputes.read', 'admin.disputes.resolve',
    'admin.imports.read', 'admin.imports.manage',
    'admin.exports.read', 'admin.exports.approve',
    'admin.audit.read',
    'admin.geography.manage', 'admin.schools.manage',
    'admin.system.manage'
  ];
  ROLE_PERMISSIONS[ROOTS_ADMIN_ROLES.CULTURAL_EDITOR] = [
    'admin.dashboard.view', 'admin.library.manage', 'admin.audit.read'
  ];
  ROLE_PERMISSIONS[ROOTS_ADMIN_ROLES.FINANCE_ADMIN] = [
    'admin.dashboard.view', 'admin.institutions.read',
    'admin.products.read', 'admin.products.manage',
    'admin.subscriptions.read', 'admin.subscriptions.manage'
  ];
  ROLE_PERMISSIONS[ROOTS_ADMIN_ROLES.SUPPORT_ADMIN] = [
    'admin.dashboard.view', 'admin.institutions.read',
    'admin.applications.read', 'admin.applications.review',
    'admin.users.read',
    'admin.subscriptions.read',
    'admin.audit.read'
  ];
  ROLE_PERMISSIONS[ROOTS_ADMIN_ROLES.AUDITOR] = [
    'admin.dashboard.view', 'admin.institutions.read',
    'admin.applications.read', 'admin.users.read',
    'admin.access.read', 'admin.disputes.read',
    'admin.imports.read', 'admin.exports.read',
    'admin.audit.read'
  ];

  function permissionsForRole(role) {
    return ROLE_PERMISSIONS[role] || [];
  }

  window.RootsAdminPerms = {
    ROLES: ROOTS_ADMIN_ROLES,
    PERMISSIONS: ROOTS_ADMIN_PERMISSIONS,
    ROLE_PERMISSIONS: ROLE_PERMISSIONS,
    permissionsForRole: permissionsForRole,
    hasAdminPermission: function (permission, session) {
      var s = session || readSession();
      if (!s || !s.role) return false;
      return permissionsForRole(s.role).indexOf(permission) !== -1;
    }
  };

  function readSession() {
    try { return JSON.parse(localStorage.getItem('roots_admin_session') || 'null'); } catch (e) { return null; }
  }
})();
