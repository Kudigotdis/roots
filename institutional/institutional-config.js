/* ============================================================
   ROOTS INSTITUTIONAL CONFIG — canonical configuration for the
   Institutional User section (B1). Single source of truth for
   institution types, staff roles, purposes, data-access groups,
   geographic scope levels and module suites.
   Consumed by institutional-login.js, institutional-onboarding.js
    and the institutional workspace modules via window.RootsInstConfig.
   ============================================================ */
(function () {
  'use strict';

  var TYPES = [
    {
      code: 'GOVERNMENT',
      cardId: 'institutionTypeGovernment',
      icon: '🏛️',
      title: 'Government',
      description: 'Administration, policy and regional data',
      roles: ['Director', 'Provincial Officer', 'District Officer', 'Data Officer', 'Research Officer', 'Viewer'],
      lifecycleEnabled: true,
      includedModules: ['GOVERNMENT_SUITE'],
      conditional: {
        heading: 'Government details',
        fields: [
          { id: 'govMinistry', label: 'Ministry / Department', type: 'text' },
          { id: 'govAdminLevel', label: 'Administrative level', type: 'select',
            options: ['National', 'Province', 'District', 'Ward', 'Village'] },
          { id: 'govJurisdiction', label: 'Jurisdiction', type: 'text' }
        ]
      }
    },
    {
      code: 'TRADITIONAL_AUTHORITY',
      cardId: 'institutionTypeTraditionalAuthority',
      icon: '👑',
      title: 'Traditional Authority',
      description: 'Chiefdom, lineage, village and customary records',
      roles: ['Chief', 'Headman', 'Sabhuku', 'Traditional Council Administrator', 'Cultural Officer', 'Research Assistant', 'Viewer'],
      lifecycleEnabled: true,
      includedModules: ['TRADITIONAL_SUITE'],
      conditional: {
        heading: 'Traditional Authority details',
        fields: [
          { id: 'taChiefdom', label: 'Chiefdom', type: 'text' },
          { id: 'taChief', label: 'Chief', type: 'text' },
          { id: 'taCouncil', label: 'Traditional Council', type: 'text' },
          { id: 'taVillageBookScope', label: 'Village / Book scope', type: 'text' }
        ]
      }
    },
    {
      code: 'UNIVERSITY_RESEARCH',
      cardId: 'institutionTypeUniversityResearch',
      icon: '🎓',
      title: 'University / Research',
      description: 'Academic and research data and lineage work',
      roles: ['Principal Investigator', 'Researcher', 'Research Assistant', 'Data Manager', 'Reviewer', 'Viewer'],
      lifecycleEnabled: true,
      includedModules: ['RESEARCH_SUITE'],
      conditional: {
        heading: 'Academic details',
        fields: [
          { id: 'uniFaculty', label: 'Faculty', type: 'text' },
          { id: 'uniResearchArea', label: 'Research area', type: 'text' }
        ]
      }
    },
    {
      code: 'ARCHIVE',
      cardId: 'institutionTypeArchive',
      icon: '🗄️',
      title: 'Archive / Records',
      description: 'Collections, archival description and finding aids',
      roles: ['Archivist', 'Senior Archivist', 'Cataloguer', 'Digital Preservation Officer', 'Researcher', 'Viewer'],
      lifecycleEnabled: true,
      includedModules: ['ARCHIVE_SUITE'],
      conditional: {
        heading: 'Archive details',
        fields: [
          { id: 'archiveType', label: 'Archive type', type: 'text' },
          { id: 'archiveCollectionResponsibility', label: 'Collection responsibility', type: 'text' },
          { id: 'archiveCataloguingStandard', label: 'Cataloguing standard', type: 'select',
            options: ['EAD3', 'EAC-CPF', 'ISAD(G)', 'Other'] }
        ]
      }
    },
    {
      code: 'MUSEUM_HERITAGE',
      cardId: 'institutionTypeMuseumHeritage',
      icon: '🏺',
      title: 'Museum / Heritage',
      description: 'Collections, people, places and cultural heritage',
      roles: ['Curator', 'Collections Manager', 'Heritage Officer', 'Cataloguer', 'Researcher', 'Viewer'],
      lifecycleEnabled: false,
      includedModules: ['HERITAGE_SUITE'],
      conditional: {
        heading: 'Heritage details',
        fields: [
          { id: 'museumCollectionType', label: 'Collection type', type: 'text' },
          { id: 'museumHeritageArea', label: 'Heritage area', type: 'text' },
          { id: 'museumCataloguing', label: 'Cataloguing', type: 'select',
            options: ['CIDOC CRM', 'Other'] }
        ]
      }
    },
    {
      code: 'NGO',
      cardId: 'institutionTypeNGO',
      icon: '🤝',
      title: 'NGO / Nonprofit',
      description: 'Community programmes and population insights',
      roles: ['Programme Manager', 'Field Officer', 'Data Officer', 'Monitoring & Evaluation Officer', 'Researcher', 'Viewer'],
      lifecycleEnabled: false,
      includedModules: [],
      conditional: {
        heading: 'Programme details',
        fields: [
          { id: 'ngoProgrammeAreas', label: 'Programme areas', type: 'text' },
          { id: 'ngoTargetCommunities', label: 'Target communities', type: 'text' }
        ]
      }
    },
    {
      code: 'GRANT',
      cardId: 'institutionTypeGrant',
      icon: '💰',
      title: 'Grant / Funding',
      description: 'Funding portfolios and programme monitoring',
      roles: ['Portfolio Manager', 'Programme Officer', 'Grants Administrator', 'Monitoring Officer', 'Analyst', 'Viewer'],
      lifecycleEnabled: false,
      includedModules: [],
      conditional: {
        heading: 'Funding details',
        fields: [
          { id: 'grantProgramme', label: 'Programme', type: 'text' },
          { id: 'grantPortfolio', label: 'Funding portfolio', type: 'text' },
          { id: 'grantReporting', label: 'Reporting requirements', type: 'text' }
        ]
      }
    },
    {
      code: 'EDUCATION',
      cardId: 'institutionTypeEducation',
      icon: '🏫',
      title: 'School / Education',
      description: 'Schools, alumni and local heritage projects',
      roles: ['Principal', 'Administrator', 'Teacher', 'Alumni Coordinator', 'Research Assistant', 'Viewer'],
      lifecycleEnabled: false,
      includedModules: [],
      conditional: null
    },
    {
      code: 'CULTURAL_ORG',
      cardId: 'institutionTypeCultural',
      icon: '🥁',
      title: 'Cultural Organisation',
      description: 'Language, totems and living cultural practices',
      roles: ['Cultural Director', 'Programmes Officer', 'Language Specialist', 'Cultural Officer', 'Researcher', 'Viewer'],
      lifecycleEnabled: false,
      includedModules: [],
      conditional: null
    },
    {
      code: 'GENEALOGY',
      cardId: 'institutionTypeGenealogy',
      icon: '🌳',
      title: 'Genealogy / Research',
      description: 'Professional family-history research services',
      roles: ['Lead Genealogist', 'Genealogist', 'Research Assistant', 'Case Manager', 'Data Manager', 'Viewer'],
      lifecycleEnabled: true,
      includedModules: ['RESEARCH_SUITE'],
      conditional: null
    }
  ];

  var PURPOSES = [
    { id: 'purposeResearch', label: 'Research' },
    { id: 'purposeAdministration', label: 'Administration' },
    { id: 'purposeGenealogy', label: 'Genealogy' },
    { id: 'purposeCulturalPreservation', label: 'Cultural Preservation' },
    { id: 'purposeArchives', label: 'Archives' },
    { id: 'purposeHeritage', label: 'Heritage' },
    { id: 'purposeEducation', label: 'Education' },
    { id: 'purposeCommunity', label: 'Community Development' },
    { id: 'purposePolicy', label: 'Policy' },
    { id: 'purposeGrant', label: 'Grant Monitoring' }
  ];

  var DATA_GROUPS = [
    {
      id: 'PEOPLE', label: 'People', personLevel: true,
      items: [
        { id: 'accessSearchPeople', label: 'Search people' },
        { id: 'accessAnalyseDemographics', label: 'Analyse demographic information' },
        { id: 'accessAddRecords', label: 'Add institutional records' },
        { id: 'accessUpdateApproved', label: 'Update approved records' }
      ]
    },
    {
      id: 'LINEAGE', label: 'Lineage',
      items: [
        { id: 'accessExploreRelationships', label: 'Explore family relationships' },
        { id: 'accessAdvancedLineage', label: 'Advanced lineage analysis' },
        { id: 'accessSuccessionResearch', label: 'Chieftainship / succession research' }
      ]
    },
    {
      id: 'CULTURAL', label: 'Cultural',
      items: [
        { id: 'accessTotems', label: 'Totems' },
        { id: 'accessPraiseNames', label: 'Praise names' },
        { id: 'accessPraiseTraditions', label: 'Praise traditions' },
        { id: 'accessProverbs', label: 'Proverbs' },
        { id: 'accessGreetings', label: 'Greetings' },
        { id: 'accessOralHistory', label: 'Oral history' }
      ]
    },
    {
      id: 'ADMINISTRATIVE', label: 'Administrative',
      items: [
        { id: 'accessProvinces', label: 'Provinces' },
        { id: 'accessDistricts', label: 'Districts' },
        { id: 'accessWards', label: 'Wards' },
        { id: 'accessChiefs', label: 'Chiefs' },
        { id: 'accessHeadmen', label: 'Headmen' },
        { id: 'accessSabhuku', label: 'Sabhuku / village records' },
        { id: 'accessVillageBooks', label: 'Village books' }
      ]
    },
    {
      id: 'LIFECYCLE', label: 'Lifecycle', needsLifecycle: true,
      items: [
        { id: 'accessDeathRecords', label: 'Death records' },
        { id: 'accessSuccession', label: 'Succession' },
        { id: 'accessEstateResearch', label: 'Estate / inheritance research' }
      ]
    }
  ];

  var SCOPE_LEVELS = [
    { id: 'scopeVillage', code: 'VILLAGE', label: 'Village', followup: 'text', prompt: 'Villages (comma separated)' },
    { id: 'scopeWard', code: 'WARD', label: 'Ward', followup: 'text', prompt: 'Wards (comma separated)' },
    { id: 'scopeChiefdom', code: 'CHIEFDOM', label: 'Chiefdom', followup: 'text', prompt: 'Chiefdoms (comma separated)' },
    { id: 'scopeDistrict', code: 'DISTRICT', label: 'District', followup: 'zwDistricts', prompt: 'Select districts' },
    { id: 'scopeProvince', code: 'PROVINCE', label: 'Province', followup: 'zwProvinces', prompt: 'Select provinces' },
    { id: 'scopeNational', code: 'NATIONAL', label: 'National', followup: 'national', prompt: 'Zimbabwe — National' },
    { id: 'scopeMultiCountry', code: 'MULTI_COUNTRY', label: 'Multi-country', followup: 'countries', prompt: 'Select countries' }
  ];

  var MODULE_SUITES = [
    {
      id: 'CORE',
      icon: '🏠',
      title: 'Core Institutional',
      state: 'included',
      items: ['Institutional dashboard', 'Search', 'Totem Directory', 'Basic reports']
    },
    {
      id: 'RESEARCH_SUITE',
      icon: '🔬',
      title: 'Research Suite',
      state: 'available',
      items: ['Advanced Lineage Auditor', 'Saved queries', 'Research projects', 'Advanced reporting']
    },
    {
      id: 'GOVERNMENT_SUITE',
      icon: '🏛️',
      title: 'Government Suite',
      state: 'available',
      items: ['Administrative data', 'Village Books', 'Regional reports', 'Succession tools', 'Dispute workflows']
    },
    {
      id: 'TRADITIONAL_SUITE',
      icon: '👑',
      title: 'Traditional Authority Suite',
      state: 'available',
      items: ['Chiefdom registry', 'Village registry', 'Lineage', 'Succession', 'Dispute review', 'Cultural records']
    },
    {
      id: 'ARCHIVE_SUITE',
      icon: '🗄️',
      title: 'Archive Suite',
      state: 'available',
      items: ['Fonds', 'Series', 'Files', 'Items', 'Finding aids', 'EAD3', 'EAC-CPF']
    },
    {
      id: 'HERITAGE_SUITE',
      icon: '🏺',
      title: 'Heritage Suite',
      state: 'available',
      items: ['Collections', 'Cultural assets', 'Oral history', 'CIDOC CRM']
    }
  ];

  var PROVINCES_ZW = ['Bulawayo', 'Harare Province', 'Manicaland', 'Mashonaland Central',
    'Mashonaland East', 'Mashonaland West', 'Matabeleland North', 'Matabeleland South',
    'Midlands', 'Masvingo'];

  function zwDistrictNames() {
    var D = window.ZIMBABWE_LOCATIONS_DATA || { districts: [] };
    return D.districts.map(function (d) { return d.name; });
  }

  function typeByCode(code) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].code === code) return TYPES[i];
    return null;
  }
  function typeByCardId(cardId) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].cardId === cardId) return TYPES[i];
    return null;
  }

  window.RootsInstConfig = {
    TYPES: TYPES,
    PURPOSES: PURPOSES,
    DATA_GROUPS: DATA_GROUPS,
    SCOPE_LEVELS: SCOPE_LEVELS,
    MODULE_SUITES: MODULE_SUITES,
    PROVINCES_ZW: PROVINCES_ZW,
    zwDistrictNames: zwDistrictNames,
    typeByCode: typeByCode,
    typeByCardId: typeByCardId,

    KEYS: {
      DRAFT: 'roots_institutional_draft',
      APPLICATIONS: 'roots_institutional_applications',
      ACCOUNTS: 'roots_institutional_accounts',
      SESSION: 'roots_institutional_session',
      SEQ: 'roots_institutional_seq'
    },

    PERSON_WARNING: 'Person-level access may require additional approval and may be restricted by organisation, geography, role and purpose.',
    SUBSCRIPTION_NOTE: 'Some requested modules may require an institutional subscription or approval.',
    SUBMIT_NOTICE: 'By submitting this application, you are requesting institutional access to Roots. Your organisation may require review before access is activated.',
    SIGNIN_NOTE: 'Your WhatsApp number will be used as the primary institutional sign-in identifier.'
  };
})();
