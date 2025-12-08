/**
 * Mock proposal data for development
 * Generates realistic proposals for all projects
 */

import { Proposal, ProjectState } from '@/types/data';

const PROPOSALS_STORAGE_KEY = 'liftwatch_proposals';

/**
 * Generate mock proposals for a given set of projects
 */
export function generateMockProposals(): Proposal[] {
  const states: ProjectState[] = ['Victoria', 'NSW', 'South Australia', 'Queensland'];
  const buildings = [
    'Westfield Shopping Centre',
    'Crown Towers',
    'The Ritz Carlton',
    'Federation Square',
    'Melbourne CBD Tower',
    'Sydney Harbour Complex',
    'Brisbane Business Park',
    'Adelaide Convention Centre',
  ];

  const clientNames = [
    'Smith & Associates',
    'Global Properties Ltd',
    'Urban Development Corp',
    'Heritage Holdings',
    'Modern Structures Inc',
    'Prestige Real Estate',
    'Capital Investments',
    'Apex Building Group',
  ];

  const proposalDescriptions = [
    'Comprehensive lift modernization and safety upgrades for mixed-use facility',
    'Feasibility study for elevator replacement in heritage building',
    'Design and installation of new passenger lift system',
    'Maintenance audit and repair specification for existing installations',
    'Accessibility improvements and lift system integration',
    'Emergency lift system upgrade and redundancy installation',
    'Smart lift technology implementation and IoT integration',
    'Capacity assessment and expansion recommendations',
  ];

  const proposals: Proposal[] = [];
  const year = new Date().getFullYear();

  for (let i = 0; i < 20; i++) {
    const state = states[i % states.length];
    const building = buildings[i % buildings.length];
    const clientName = clientNames[i % clientNames.length];
    const status: any = ['Draft', 'Sent', 'Under Review', 'Accepted', 'Rejected'][i % 5];

    const basePrice = 15000 + Math.random() * 85000;
    const stages = [
      { name: 'Feasibility', price: basePrice * 0.15 },
      { name: 'Technical Specification', price: basePrice * 0.2 },
      { name: 'Tender', price: basePrice * 0.15 },
      { name: 'Contract Draft', price: basePrice * 0.2 },
      { name: 'Project Management', price: basePrice * 0.3 },
    ];

    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 90));

    const proposal: Proposal = {
      id: `proposal_${i}_${Date.now()}`,
      proposalNumber: `PROP-${year}-${String(i + 1).padStart(3, '0')}`,
      clientName,
      clientContact: `contact@${clientName.toLowerCase().replace(/\s+/g, '')}.com`,
      siteName: building,
      siteAddress: `${100 + i} Market Street`,
      state,
      city: state === 'Victoria' ? 'Melbourne' : state === 'NSW' ? 'Sydney' : state === 'South Australia' ? 'Adelaide' : 'Brisbane',
      postcode: String(3000 + Math.floor(Math.random() * 7000)),
      description: proposalDescriptions[i % proposalDescriptions.length],
      estimatedValue: basePrice,
      status,
      stages: stages as any,
      sentDate: status !== 'Draft' ? new Date(createdDate.getTime() + 86400000).toISOString() : undefined,
      expiryDate: status === 'Sent' || status === 'Under Review'
        ? new Date(createdDate.getTime() + 7776000000).toISOString() // 90 days
        : undefined,
      acceptedDate: status === 'Accepted'
        ? new Date(createdDate.getTime() + 259200000).toISOString() // 3 days
        : undefined,
      rejectedDate: status === 'Rejected'
        ? new Date(createdDate.getTime() + 172800000).toISOString() // 2 days
        : undefined,
      rejectionReason: status === 'Rejected' ? 'Client decided to use internal resources' : undefined,
      notes: `Priority: ${['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)]} | Follow-up: ${new Date(createdDate.getTime() + 604800000).toLocaleDateString()}`,
      attachments: ['spec_sheet.pdf', 'pricing_summary.xlsx'],
      createdBy: 'admin@liftconsult.com.au',
      createdAt: createdDate.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    proposals.push(proposal);
  }

  return proposals;
}

/**
 * Initialize mock proposals in localStorage if they don't exist or are too few
 * Ensures we always have sufficient test data while preserving user-created proposals
 */
export function initializeMockProposals(): void {
  try {
    const existing = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    const existingProposals = existing ? JSON.parse(existing) : [];

    // If we have fewer than 5 proposals, generate and merge with existing ones
    if (existingProposals.length < 5) {
      const mockProposals = generateMockProposals();

      // Merge: keep existing proposals and add mock ones
      const mergedProposals = [...existingProposals, ...mockProposals];
      localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(mergedProposals));
      console.log('[mockProposalData] Initialized mock proposals. Total proposals:', mergedProposals.length);
    }
  } catch (err) {
    console.error('[mockProposalData] Error initializing mock proposals:', err);
  }
}
