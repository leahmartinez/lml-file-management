import { User, Asset, Site, Project } from '@/types/data';

export const mockUsers: User[] = [
  {
    username: 'national_manager',
    password: 'password', // Plain text - will be hashed during migration
    role: 'national_manager',
    sites: [],
  },
  {
    username: 'site_manager_a',
    password: 'password', // Plain text - will be hashed during migration
    role: 'site_manager',
    sites: ['Tower A'],
  },
  {
    username: 'site_manager_b',
    password: 'password', // Plain text - will be hashed during migration
    role: 'site_manager',
    sites: ['Tower B'],
  },
  {
    username: 'admin',
    password: 'password', // Plain text - will be hashed during migration
    role: 'admin',
    sites: [],
  },
  {
    username: 'consultant',
    password: 'password', // Plain text - will be hashed during migration
    role: 'consultant',
    sites: [],
  },
];

export const mockAssets: Asset[] = [
  {
    id: 'ELV-001',
    nickname: 'Elevator 1',
    type: 'Elevator',
    status: 'Active',
    building: 'Tower A',
    projectCode: 'PW001',
    contractor: 'Otis',
    lastService: '2024-01-15',
    nextMaintenance: '2024-02-15',
  },
  {
    id: 'ESC-001',
    nickname: 'Escalator 1',
    type: 'Escalator',
    status: 'Operational',
    building: 'Tower B',
    projectCode: 'PW002',
    contractor: 'Schindler',
    lastService: '2024-01-20',
    nextMaintenance: '2024-02-20',
  },
];

export const mockSites: Site[] = [
  {
    building: 'Tower A',
    address: '123 Main St',
    state: 'NSW',
    city: 'Sydney',
    country: 'Australia',
  },
  {
    building: 'Tower B',
    address: '456 Oak Ave',
    state: 'VIC',
    city: 'Melbourne',
    country: 'Australia',
  },
];

export const mockProjects: Project[] = [
  {
    projectCode: 'PW001',
    building: 'Tower A',
    description: 'Elevator Upgrade Project',
  },
  {
    projectCode: 'PW002',
    building: 'Tower B',
    description: 'Escalator Maintenance',
  },
];

