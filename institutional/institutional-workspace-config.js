/* ============================================================
   INSTITUTIONAL WORKSPACE CONFIG (Setup 4 §57-61).
   Per-type workspace configuration + institutional role
   permissions. Organisation types are NOT menus — each type
   gets exactly its own navigation and widgets.
   ============================================================ */
(function () {
  'use strict';

  window.RootsInstViews = window.RootsInstViews || [];

  /* ---------- institutional role permissions (central map) ---------- */
  var INST_ROLES = {
    ADMINISTRATOR: 'ADMINISTRATOR',
    RESEARCHER: 'Researcher',
    ARCHIVIST: 'Archivist',
    DATA_OFFICER: 'Data Officer',
    VIEWER: 'Viewer'
  };

  var ALL_PERMS = [
    'inst.overview', 'inst.search', 'inst.totems', 'inst.culture',
    'inst.person.detail', 'inst.lineage', 'inst.succession', 'inst.lifecycle',
    'inst.villages', 'inst.families', 'inst.collections',
    'inst.projects.manage', 'inst.saved.queries',
    'inst.reports.run', 'inst.exports.request',
    'inst.disputes.view', 'inst.disputes.resolve',
    'inst.corrections.submit', 'inst.access.request',
    'inst.audit.org', 'inst.users.manage', 'inst.organisation.manage'
  ];

  var ROLE_PERMISSIONS = {};
  ROLE_PERMISSIONS[INST_ROLES.ADMINISTRATOR] = ALL_PERMS.slice();
  ROLE_PERMISSIONS[INST_ROLES.RESEARCHER] = [
    'inst.overview', 'inst.search', 'inst.totems', 'inst.culture',
    'inst.person.detail', 'inst.lineage', 'inst.projects.manage',
    'inst.saved.queries', 'inst.reports.run', 'inst.exports.request',
    'inst.disputes.view', 'inst.corrections.submit', 'inst.access.request'
  ];
  ROLE_PERMISSIONS[INST_ROLES.ARCHIVIST] = [
    'inst.overview', 'inst.search', 'inst.totems', 'inst.culture',
    'inst.person.detail', 'inst.lineage', 'inst.reports.run',
    'inst.exports.request', 'inst.corrections.submit', 'inst.access.request'
  ];
  ROLE_PERMISSIONS[INST_ROLES.DATA_OFFICER] = [
    'inst.overview', 'inst.search', 'inst.totems', 'inst.person.detail',
    'inst.lifecycle', 'inst.disputes.view', 'inst.disputes.resolve',
    'inst.corrections.submit', 'inst.reports.run', 'inst.access.request'
  ];
  ROLE_PERMISSIONS[INST_ROLES.VIEWER] = [
    'inst.overview', 'inst.search', 'inst.totems', 'inst.reports.run'
  ];

  function permissionsForRole(role) {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[INST_ROLES.VIEWER];
  }

  /* ---------- per-type workspace configuration (§57) ---------- */
  var INSTITUTION_WORKSPACE_CONFIG = {
    GOVERNMENT: {
      landingTitle: 'REGIONAL DATA OVERVIEW',
      navigation: ['overview', 'records', 'villages', 'lineage', 'lifecycle', 'succession', 'disputes', 'reports', 'exports', 'access', 'organisation'],
      defaultView: 'overview',
      dashboardWidgets: ['people', 'chiefdoms', 'districts', 'villageBooks', 'totems', 'disputes'],
      primaryActions: ['records', 'villages', 'lineage', 'succession', 'reports'],
      recommendedReports: ['People by province', 'Village books by district'],
      planSuite: 'GOVERNMENT_SUITE'
    },
    TRADITIONAL_AUTHORITY: {
      landingTitle: 'CHIEFDOM REGISTER',
      navigation: ['overview', 'records', 'families', 'totems', 'villages', 'lineage', 'lifecycle', 'succession', 'disputes', 'reports', 'organisation'],
      defaultView: 'overview',
      dashboardWidgets: ['people', 'families', 'totems', 'villageBooks', 'sabhuku', 'disputes'],
      primaryActions: ['records', 'families', 'totems', 'villages', 'lineage', 'succession', 'disputes'],
      recommendedReports: ['Households by village book', 'Totem distribution'],
      planSuite: 'TRADITIONAL_SUITE'
    },
    UNIVERSITY_RESEARCH: {
      landingTitle: 'RESEARCH OVERVIEW',
      navigation: ['overview', 'records', 'lineage', 'projects', 'saved', 'reports', 'exports', 'access', 'organisation'],
      defaultView: 'overview',
      dashboardWidgets: ['projects', 'savedQueries', 'datasets', 'exports'],
      primaryActions: ['records', 'lineage', 'projects', 'saved', 'reports', 'exports'],
      recommendedReports: ['People analysed by province', 'Language cluster distribution'],
      planSuite: 'RESEARCH_SUITE'
    },
    ARCHIVE: {
      landingTitle: 'ARCHIVAL COLLECTIONS',
      navigation: ['overview', 'collections', 'findingAids', 'records', 'places', 'reports', 'exports', 'organisation'],
      defaultView: 'collections',
      dashboardWidgets: ['collections', 'files', 'items', 'findingAids'],
      primaryActions: ['collections', 'findingAids', 'records', 'places', 'exports'],
      recommendedReports: ['Items by fonds', 'People referenced by collection'],
      planSuite: 'ARCHIVE_SUITE'
    },
    MUSEUM_HERITAGE: {
      landingTitle: 'HERITAGE COLLECTIONS',
      navigation: ['overview', 'collections', 'records', 'totems', 'culture', 'places', 'reports', 'exports', 'organisation'],
      defaultView: 'overview',
      dashboardWidgets: ['collections', 'objects', 'people', 'oralHistories', 'totems'],
      primaryActions: ['collections', 'records', 'totems', 'culture', 'places', 'reports'],
      recommendedReports: ['Objects by collection', 'Cultural records by province'],
      planSuite: 'HERITAGE_SUITE'
    },
    NGO: {
      landingTitle: 'COMMUNITY PROGRAMMES',
      navigation: ['overview', 'records', 'villages', 'places', 'reports', 'exports', 'access'],
      defaultView: 'overview',
      dashboardWidgets: ['communities', 'people', 'regions', 'reports'],
      primaryActions: ['records', 'villages', 'places', 'reports', 'exports'],
      recommendedReports: ['Participants by district', 'Age bands by province'],
      planSuite: null
    },
    GRANT: {
      landingTitle: 'HERITAGE PORTFOLIO',
      navigation: ['overview', 'projects', 'places', 'reports', 'exports'],
      defaultView: 'overview',
      dashboardWidgets: ['projects', 'regions', 'totems', 'reports'],
      primaryActions: ['projects', 'places', 'reports', 'exports'],
      recommendedReports: ['Portfolio by region', 'Cultural assets by province'],
      planSuite: null
    },
    EDUCATION: {
      landingTitle: 'EDUCATION & COMMUNITY HISTORY',
      navigation: ['overview', 'records', 'schools', 'totems', 'culture', 'reports'],
      defaultView: 'overview',
      dashboardWidgets: ['learners', 'schools', 'languages', 'totems'],
      primaryActions: ['records', 'schools', 'totems', 'culture', 'reports'],
      recommendedReports: ['Languages by province', 'Schools by district'],
      planSuite: null
    },
    CULTURAL_ORG: {
      landingTitle: 'CULTURAL RECORDS',
      navigation: ['overview', 'totems', 'culture', 'records', 'places', 'reports'],
      defaultView: 'overview',
      dashboardWidgets: ['totems', 'proverbs', 'greetings', 'languages'],
      primaryActions: ['totems', 'culture', 'records', 'places', 'reports'],
      recommendedReports: ['Totems by cultural system', 'Proverbs by category'],
      planSuite: 'HERITAGE_SUITE'
    },
    GENEALOGY: {
      landingTitle: 'GENEALOGY RESEARCH',
      navigation: ['overview', 'records', 'families', 'lineage', 'projects', 'saved', 'reports', 'exports', 'organisation'],
      defaultView: 'overview',
      dashboardWidgets: ['cases', 'people', 'families', 'exports'],
      primaryActions: ['records', 'families', 'lineage', 'projects', 'saved', 'reports', 'exports'],
      recommendedReports: ['Cases by status', 'Totems by province'],
      planSuite: 'RESEARCH_SUITE'
    }
  };

  function configForType(typeCode) {
    return INSTITUTION_WORKSPACE_CONFIG[typeCode] || INSTITUTION_WORKSPACE_CONFIG.UNIVERSITY_RESEARCH;
  }

  window.RootsInstWorkspaceConfig = {
    ROLES: INST_ROLES,
    PERMISSIONS: ALL_PERMS,
    ROLE_PERMISSIONS: ROLE_PERMISSIONS,
    permissionsForRole: permissionsForRole,
    WORKSPACE_CONFIG: INSTITUTION_WORKSPACE_CONFIG,
    configForType: configForType
  };
})();
