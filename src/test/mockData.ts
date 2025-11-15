import type { Site, Project, ProjectStage, ProjectNote } from '@/types/data';

/**
 * Mock Project Stages - Fixed 5 stages per project
 */
const createMockStages = (projectCode: string): ProjectStage[] => [
  {
    id: `${projectCode}-stage-1`,
    name: 'Feasibility',
    projectCode,
    files: [],
    order: 1,
    description: 'Initial feasibility assessment and site surveys',
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: `${projectCode}-stage-2`,
    name: 'Technical Specification',
    projectCode,
    files: [],
    order: 2,
    description: 'Detailed technical specifications and engineering drawings',
    createdAt: '2025-01-20T00:00:00Z',
  },
  {
    id: `${projectCode}-stage-3`,
    name: 'Tender',
    projectCode,
    files: [],
    order: 3,
    description: 'Tender documentation and contractor bidding',
    createdAt: '2025-02-01T00:00:00Z',
  },
  {
    id: `${projectCode}-stage-4`,
    name: 'Contract Draft',
    projectCode,
    files: [],
    order: 4,
    description: 'Contract negotiation and finalization',
    createdAt: '2025-02-10T00:00:00Z',
  },
  {
    id: `${projectCode}-stage-5`,
    name: 'Project Management',
    projectCode,
    files: [],
    order: 5,
    description: 'Project execution and ongoing management',
    createdAt: '2025-02-20T00:00:00Z',
  },
];

/**
 * Mock Project Notes - Historical timeline
 */
const mockProjectNotes: Record<string, ProjectNote[]> = {
  PV1296: [
    {
      id: 'note-pv1296-1',
      projectCode: 'PV1296',
      content: 'Initial site inspection completed. 6 lifts identified for modernization. Building is a busy shopping complex with heavy foot traffic.',
      author: 'consultant@lml.com',
      authorName: 'John Smith',
      createdAt: '2025-01-20T10:30:00Z',
      status: 'Active',
    },
    {
      id: 'note-pv1296-2',
      projectCode: 'PV1296',
      content: 'Site survey completed. All dimensions and technical details documented. Client approval obtained to proceed with feasibility stage.',
      author: 'consultant@lml.com',
      authorName: 'John Smith',
      createdAt: '2025-01-25T14:15:00Z',
      status: 'Active',
    },
    {
      id: 'note-pv1296-3',
      projectCode: 'PV1296',
      content: 'Feasibility report submitted to client. Recommended solution: 6x modernization kits with new controls and drive systems.',
      author: 'manager@lml.com',
      authorName: 'Sarah Johnson',
      createdAt: '2025-02-05T09:00:00Z',
      status: 'Active',
    },
  ],
  PN2001: [
    {
      id: 'note-pn2001-1',
      projectCode: 'PN2001',
      content: 'Project initiated. Tower A Sydney - 3 elevator modernization.',
      author: 'consultant@lml.com',
      authorName: 'John Smith',
      createdAt: '2025-01-10T08:00:00Z',
      status: 'Active',
    },
  ],
};

/**
 * Mock Projects - Using new state-based code format
 */
export const mockProjects: Project[] = [
  {
    projectCode: 'PV1296',
    building: 'Melbourne Central',
    description: 'Lift modernization project for Melbourne Central shopping complex - 6 elevators requiring upgrades and modernization',
    status: 'Active',
    state: 'Victoria',
    stages: createMockStages('PV1296'),
    notes: mockProjectNotes['PV1296'] || [],
    contacts: ['consultant@lml.com', 'manager@lml.com'],
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-02-05T09:00:00Z',
    createdBy: 'admin@lml.com',
  },
  {
    projectCode: 'PN2001',
    building: 'Sydney Tower',
    description: 'Elevator modernization at Tower A Sydney - 3 elevators',
    status: 'Active',
    state: 'NSW',
    stages: createMockStages('PN2001'),
    notes: mockProjectNotes['PN2001'] || [],
    contacts: ['consultant@lml.com'],
    createdAt: '2025-01-10T00:00:00Z',
    updatedAt: '2025-01-10T08:00:00Z',
    createdBy: 'admin@lml.com',
  },
  {
    projectCode: 'PSA0045',
    building: 'Adelaide Plaza',
    description: 'Moving walkway inspection and maintenance - Adelaide Plaza shopping center',
    status: 'On Hold',
    state: 'South Australia',
    stages: createMockStages('PSA0045'),
    notes: [],
    contacts: [],
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    createdBy: 'admin@lml.com',
  },
  {
    projectCode: 'PQ3012',
    building: 'Brisbane Heights',
    description: 'Elevator control system upgrade - Brisbane Heights office building',
    status: 'Completed',
    state: 'Queensland',
    stages: createMockStages('PQ3012'),
    notes: [],
    contacts: ['manager@lml.com'],
    createdAt: '2024-10-15T00:00:00Z',
    updatedAt: '2025-02-01T00:00:00Z',
    createdBy: 'admin@lml.com',
  },
];

/**
 * Mock Sites - Consulting sites
 */
export const mockSites: Site[] = [
  {
    building: 'Melbourne Central',
    address: '211 La Trobe Street',
    state: 'Victoria',
    city: 'Melbourne',
    country: 'Australia',
    description: 'Large shopping complex in Melbourne CBD with multiple elevator systems requiring modernization',
    projects: mockProjects.filter((p) => p.building === 'Melbourne Central'),
    contacts: ['consultant@lml.com', 'manager@lml.com'],
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-02-05T09:00:00Z',
  },
  {
    building: 'Sydney Tower',
    address: '100 Miller Street',
    state: 'NSW',
    city: 'Sydney',
    country: 'Australia',
    description: 'Premium office tower in North Sydney with mixed-use elevator systems',
    projects: mockProjects.filter((p) => p.building === 'Sydney Tower'),
    contacts: ['consultant@lml.com'],
    createdAt: '2025-01-10T00:00:00Z',
    updatedAt: '2025-01-10T08:00:00Z',
  },
  {
    building: 'Adelaide Plaza',
    address: '50 Rundle Mall',
    state: 'South Australia',
    city: 'Adelaide',
    country: 'Australia',
    description: 'Central Adelaide shopping mall with moving walkway systems',
    projects: mockProjects.filter((p) => p.building === 'Adelaide Plaza'),
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
  },
  {
    building: 'Brisbane Heights',
    address: '300 Queen Street',
    state: 'Queensland',
    city: 'Brisbane',
    country: 'Australia',
    description: 'Modern office building in Brisbane CBD',
    projects: mockProjects.filter((p) => p.building === 'Brisbane Heights'),
    contacts: ['manager@lml.com'],
    createdAt: '2024-10-15T00:00:00Z',
    updatedAt: '2025-02-01T00:00:00Z',
  },
];
