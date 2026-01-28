/**
 * Complete mock data generator for full application pipeline
 * Generates interconnected Sites, Contacts, Projects, and Proposals
 */

import { Site, Unit, DirectoryContact, Project, ProjectStage, ProjectStageName, ProjectState, Proposal, ExternalContact } from '@/types/data';

const SITES_STORAGE_KEY = 'lml_sites';
const EXTERNAL_CONTACTS_KEY = 'lml_external_contacts';
const PROJECTS_STORAGE_KEY = 'lml_projects';
const INIT_VERSION_KEY = 'mockDataVersion';
const CURRENT_VERSION = '1.2'; // Bumped to clear phantom projects PV0004, PV0005 from old localStorage

/**
 * Generate realistic mock sites with units/lifts
 */
export function generateMockSites(): Site[] {
  const sites: Site[] = [
    {
      building: 'Westfield Shopping Centre',
      address: '100 Market Street',
      state: 'Victoria',
      city: 'Melbourne',
      postcode: '3000',
      description: 'Major shopping centre with multiple levels and zones',
      status: 'Active',
      projects: [],
      units: [
        { id: 'unit_1', name: 'Main Level Lift 1', location: 'Ground Floor', siteName: 'Westfield Shopping Centre', createdAt: new Date().toISOString() },
        { id: 'unit_2', name: 'Main Level Lift 2', location: 'Ground Floor', siteName: 'Westfield Shopping Centre', createdAt: new Date().toISOString() },
        { id: 'unit_3', name: 'Service Lift', location: 'Back of House', siteName: 'Westfield Shopping Centre', createdAt: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      building: 'Crown Towers',
      address: '8 Whiteman Street',
      state: 'Victoria',
      city: 'Melbourne',
      postcode: '3006',
      description: 'Premium hotel and residential towers',
      status: 'Active',
      projects: [],
      units: [
        { id: 'unit_4', name: 'Hotel Lift Bank A', location: 'Main Lobby', siteName: 'Crown Towers', createdAt: new Date().toISOString() },
        { id: 'unit_5', name: 'Hotel Lift Bank B', location: 'Main Lobby', siteName: 'Crown Towers', createdAt: new Date().toISOString() },
        { id: 'unit_6', name: 'Residential Lift 1', location: 'Tower A', siteName: 'Crown Towers', createdAt: new Date().toISOString() },
        { id: 'unit_7', name: 'Residential Lift 2', location: 'Tower B', siteName: 'Crown Towers', createdAt: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      building: 'Sydney Harbour Complex',
      address: '250 George Street',
      state: 'NSW',
      city: 'Sydney',
      postcode: '2000',
      description: 'Mixed-use development with commercial and retail',
      status: 'Active',
      projects: [],
      units: [
        { id: 'unit_8', name: 'Commercial Lift 1', location: 'Floors 1-10', siteName: 'Sydney Harbour Complex', createdAt: new Date().toISOString() },
        { id: 'unit_9', name: 'Commercial Lift 2', location: 'Floors 11-20', siteName: 'Sydney Harbour Complex', createdAt: new Date().toISOString() },
        { id: 'unit_10', name: 'Retail Access Lift', location: 'Ground Level', siteName: 'Sydney Harbour Complex', createdAt: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      building: 'Brisbane Business Park',
      address: '300 George Street',
      state: 'Queensland',
      city: 'Brisbane',
      postcode: '4000',
      description: 'Corporate business park with modern amenities',
      status: 'Active',
      projects: [],
      units: [
        { id: 'unit_11', name: 'Building A Lift 1', location: 'Main Atrium', siteName: 'Brisbane Business Park', createdAt: new Date().toISOString() },
        { id: 'unit_12', name: 'Building A Lift 2', location: 'Main Atrium', siteName: 'Brisbane Business Park', createdAt: new Date().toISOString() },
        { id: 'unit_13', name: 'Building B Lift 1', location: 'Secondary Tower', siteName: 'Brisbane Business Park', createdAt: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      building: 'Adelaide Convention Centre',
      address: 'North Terrace',
      state: 'South Australia',
      city: 'Adelaide',
      postcode: '5000',
      description: 'Convention and events venue with public access',
      status: 'Active',
      projects: [],
      units: [
        { id: 'unit_14', name: 'Main Hall Lift', location: 'Hall A', siteName: 'Adelaide Convention Centre', createdAt: new Date().toISOString() },
        { id: 'unit_15', name: 'VIP Access Lift', location: 'Executive Level', siteName: 'Adelaide Convention Centre', createdAt: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return sites;
}

/**
 * Generate realistic mock client contacts (as ExternalContact format)
 */
export function generateMockContacts(): ExternalContact[] {
  const now = new Date().toISOString();
  const contacts: ExternalContact[] = [
    // Client Contacts - Westfield
    {
      id: 'contact_1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@westfield.com.au',
      position: 'Facilities Manager',
      company: 'Westfield Shopping Centre',
      phone: '0434 567 890',
      officePhone: '(03) 9200 4000',
      category: 'Client',
      createdBy: 'leah@lmllift.com',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'contact_2',
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.chen@westfield.com.au',
      position: 'Operations Director',
      company: 'Westfield Shopping Centre',
      phone: '0445 678 901',
      officePhone: '(03) 9200 4001',
      category: 'Client',
      createdBy: 'leah@lmllift.com',
      createdAt: now,
      updatedAt: now,
    },
    // Client Contacts - Crown
    {
      id: 'contact_3',
      firstName: 'Emma',
      lastName: 'Wilson',
      email: 'emma.wilson@crown.com.au',
      position: 'Engineering Manager',
      company: 'Crown Towers',
      phone: '0456 789 012',
      officePhone: '(03) 9292 8888',
      category: 'Client',
      createdBy: 'leah@lmllift.com',
      createdAt: now,
      updatedAt: now,
    },
    // Client Contacts - Sydney Harbour
    {
      id: 'contact_4',
      firstName: 'David',
      lastName: 'Thompson',
      email: 'david.thompson@sydneyharbour.com.au',
      position: 'Project Manager',
      company: 'Sydney Harbour Complex',
      phone: '0467 890 123',
      officePhone: '(02) 9250 1234',
      category: 'Client',
      createdBy: 'leah@lmllift.com',
      createdAt: now,
      updatedAt: now,
    },
    // Client Contacts - Brisbane
    {
      id: 'contact_5',
      firstName: 'Lisa',
      lastName: 'Anderson',
      email: 'lisa.anderson@businesspark.com.au',
      position: 'Asset Manager',
      company: 'Brisbane Business Park',
      phone: '0478 901 234',
      officePhone: '(07) 3000 1000',
      category: 'Client',
      createdBy: 'leah@lmllift.com',
      createdAt: now,
      updatedAt: now,
    },
    // Client Contacts - Adelaide
    {
      id: 'contact_6',
      firstName: 'Robert',
      lastName: 'Miller',
      email: 'robert.miller@conventioncentre.com.au',
      position: 'Building Manager',
      company: 'Adelaide Convention Centre',
      phone: '0489 012 345',
      officePhone: '(08) 6213 6600',
      category: 'Client',
      createdBy: 'leah@lmllift.com',
      createdAt: now,
      updatedAt: now,
    },
    // Contractor/Supplier
    {
      id: 'contact_7',
      firstName: 'Mark',
      lastName: 'Harrison',
      email: 'mark@liftinstallations.com.au',
      position: 'Installation Manager',
      company: 'Lift Installations Australia',
      phone: '0490 123 456',
      officePhone: '1800 LIFTS NOW',
      category: 'Contractor',
      createdBy: 'leah@lmllift.com',
      createdAt: now,
      updatedAt: now,
    },
  ];

  return contacts;
}

/**
 * Generate realistic mock projects linked to sites
 */
export function generateMockProjects(): Project[] {
  const stageDefs: ProjectStageName[] = ['Feasibility', 'Technical Specification', 'Tender', 'Contract Draft', 'Project Management'];
  const projects: Project[] = [];
  const statePrefix = { Victoria: 'PV', NSW: 'PN', 'South Australia': 'PSA', Queensland: 'PQ' };

  const sitesAndClients = [
    { site: 'Westfield Shopping Centre', state: 'Victoria' as ProjectState, client: 'sarah.johnson@westfield.com.au' },
    { site: 'Crown Towers', state: 'Victoria' as ProjectState, client: 'emma.wilson@crown.com.au' },
    { site: 'Sydney Harbour Complex', state: 'NSW' as ProjectState, client: 'david.thompson@sydneyharbour.com.au' },
    { site: 'Brisbane Business Park', state: 'Queensland' as ProjectState, client: 'lisa.anderson@businesspark.com.au' },
    { site: 'Adelaide Convention Centre', state: 'South Australia' as ProjectState, client: 'robert.miller@conventioncentre.com.au' },
  ];

  // Create 3-4 projects per site
  let projectNumber = 1;
  sitesAndClients.forEach(({ site, state, client }) => {
    const prefix = statePrefix[state];
    for (let i = 0; i < 3; i++) {
      const code = `${prefix}${String(projectNumber).padStart(4, '0')}`;
      projectNumber++;

      const stages: ProjectStage[] = stageDefs.map((stageName, index) => ({
        id: `stage_${code}_${index}`,
        name: stageName,
        projectCode: code,
        files: [],
        order: index + 1,
        description: `${stageName} stage for ${site}`,
        status: index < 2 ? 'Complete' : 'In Progress',
        price: (15000 + Math.random() * 50000),
        projectType: ['Upgrade', 'MACA', 'CMA', 'Desktop Review'][Math.floor(Math.random() * 4)] as any,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      projects.push({
        projectCode: code,
        building: site,
        description: `${site} - ${['Lift modernization', 'Safety upgrade', 'Accessibility improvement'][Math.floor(Math.random() * 3)]}`,
        status: 'Active',
        state,
        stages,
        notes: [],
        contacts: [client],
        primaryClientEmail: client,
        orderDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
        invoiceStatus: ['Not Ready', 'Ready for Invoice', 'Invoiced'][Math.floor(Math.random() * 3)] as any,
        projectType: stages[0].projectType,
        projectValue: stages.reduce((sum, s) => sum + (s.price || 0), 0),
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'leah@lmllift.com',
      });
    }
  });

  return projects;
}

/**
 * Generate mock proposals linked to projects and clients
 */
export function generateMockProposalsLinked(projects: Project[]): Proposal[] {
  const year = new Date().getFullYear();
  const proposals: Proposal[] = [];

  // Create 1-2 proposals per project
  projects.forEach((project, index) => {
    const numProposals = Math.random() > 0.6 ? 2 : 1;

    for (let i = 0; i < numProposals; i++) {
      const proposalIndex = proposals.length + 1;
      const status: any = ['Draft', 'Sent', 'Under Review', 'Accepted'][Math.floor(Math.random() * 4)];

      const proposal: Proposal = {
        id: `proposal_${proposalIndex}_${Date.now() + i}`,
        proposalNumber: `PROP-${year}-${String(proposalIndex).padStart(3, '0')}`,
        clientName: project.contacts?.[0]?.split('@')[0] || 'Unknown',
        clientContact: project.contacts?.[0] || '',
        siteName: project.building,
        siteAddress: '', // Will be filled from site data
        state: project.state,
        city: project.state === 'Victoria' ? 'Melbourne' : project.state === 'NSW' ? 'Sydney' : project.state === 'Queensland' ? 'Brisbane' : 'Adelaide',
        postcode: '',
        description: project.description || `Consulting proposal for ${project.building}`,
        estimatedValue: project.projectValue || (Math.random() * 100000 + 30000),
        status,
        stages: project.stages.map(s => ({
          name: s.name,
          price: s.price,
          status: s.status,
          units: [],
          files: [],
          description: s.description,
          dueDate: '',
        })) as any,
        sentDate: status !== 'Draft' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        expiryDate: ['Sent', 'Under Review'].includes(status) ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        acceptedDate: status === 'Accepted' ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        acceptedStageNames: status === 'Accepted' ? project.stages.map(s => s.name) : undefined,
        projectCode: status === 'Accepted' ? project.projectCode : undefined,
        notes: `Proposal for ${project.building} lift ${['modernization', 'upgrade', 'maintenance'][Math.floor(Math.random() * 3)]}`,
        attachments: ['proposal_summary.pdf', 'technical_specs.pdf'],
        createdBy: 'leah@lmllift.com',
        createdAt: new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      proposals.push(proposal);
    }
  });

  return proposals;
}

/**
 * Initialize all mock data in localStorage
 */
export function initializeAllMockData(): void {
  try {
    // Generate all data
    const sites = generateMockSites();
    const contacts = generateMockContacts();
    const projects = generateMockProjects();

    // Link sites to projects
    sites.forEach(site => {
      site.projects = projects.filter(p => p.building === site.building);
    });

    // Generate proposals linked to projects
    const proposals = generateMockProposalsLinked(projects);

    // Fill in proposal site details from sites
    proposals.forEach(proposal => {
      const site = sites.find(s => s.building === proposal.siteName);
      if (site) {
        proposal.siteAddress = site.address;
        proposal.postcode = site.postcode;
      }
    });

    // Store all data
    localStorage.setItem(SITES_STORAGE_KEY, JSON.stringify(sites));
    localStorage.setItem(EXTERNAL_CONTACTS_KEY, JSON.stringify(contacts));
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    localStorage.setItem('lml_proposals', JSON.stringify(proposals));
    localStorage.setItem('mockDataInitialized', 'true'); // Mark initialization as complete
    localStorage.setItem(INIT_VERSION_KEY, CURRENT_VERSION); // Store version for future checks

    console.log('[mockFullDataGenerator] Initialized complete data pipeline:');
    console.log(`  - ${sites.length} sites with units/lifts`);
    console.log(`  - ${contacts.length} client contacts`);
    console.log(`  - ${projects.length} projects with stages`);
    console.log(`  - ${proposals.length} proposals linked to projects`);
  } catch (err) {
    console.error('[mockFullDataGenerator] Error initializing mock data:', err);
  }
}

/**
 * Clear all mock data from localStorage
 */
export function clearAllMockData(): void {
  localStorage.removeItem(SITES_STORAGE_KEY);
  localStorage.removeItem(EXTERNAL_CONTACTS_KEY);
  localStorage.removeItem(PROJECTS_STORAGE_KEY);
  localStorage.removeItem('lml_proposals');
  localStorage.removeItem('mockDataInitialized'); // Clear initialization flag
  console.log('[mockFullDataGenerator] Cleared all mock data');
}

/**
 * Check if mock data has already been initialized with the current version
 * If version doesn't match, data needs to be re-initialized
 */
export function isMockDataInitialized(): boolean {
  const initialized = localStorage.getItem('mockDataInitialized') === 'true';
  const version = localStorage.getItem(INIT_VERSION_KEY);

  // Only consider initialized if both flag is true AND version matches
  return initialized && version === CURRENT_VERSION;
}
