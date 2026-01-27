/**
 * Data Service Layer
 *
 * Abstracts data fetching from CSV or API data sources.
 * Local development uses CSV files - NO hardcoded test data is displayed.
 *
 * IMPORTANT: Mock data is only used during testing (when vitest runs).
 * In local development (.env.local), VITE_USE_MOCK_DATA=false ensures
 * all data comes from CSV files only.
 */

import Papa from 'papaparse';
import { DataSourceConfig, Asset, Site, Project, Contact, DataHierarchy, ProjectStage, ProjectStageName, ProjectStageStatus, ProjectState } from '@/types/data';
import { dataSourceConfig } from '@/config/dataSource';
import { mockSites, mockProjects } from '@/test/mockData'; // Only for tests

/**
 * Parse CSV file and return data
 */
async function fetchCSV<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    // Read all chunks from the response (fixes truncation for large files)
    const chunks: Uint8Array[] = [];
    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }

    // Combine all chunks and decode
    const decoder = new TextDecoder('utf-8');
    const allData = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
    const csv = decoder.decode(allData);

    return new Promise((resolve, reject) => {
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as T[]);
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    });
  } catch (error) {
    throw new Error(`Error fetching CSV from ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch data from API endpoint
 */
async function fetchAPI<T>(endpoint: string): Promise<T[]> {
  try {
    const baseUrl = dataSourceConfig.baseUrl || '';
    const url = `${baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers here when API is ready
        // 'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle different API response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (data.results && Array.isArray(data.results)) {
      return data.results;
    }
    
    throw new Error('Unexpected API response format');
  } catch (error) {
    throw new Error(`Error fetching from API ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if we're using mock data (local development mode)
 */
function useMockData(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
}

/**
 * Generic data fetcher that switches between CSV, API, and Mock data
 */
async function fetchData<T>(config: { csvPath?: string; apiEndpoint?: string }): Promise<T[]> {
  // In local development mode, skip API/CSV and return empty (will be overridden by specific functions)
  if (useMockData()) {
    return [];
  }

  if (dataSourceConfig.type === 'api' && config.apiEndpoint) {
    return fetchAPI<T>(config.apiEndpoint);
  } else if (dataSourceConfig.type === 'csv' && config.csvPath) {
    return fetchCSV<T>(config.csvPath);
  }

  throw new Error('No valid data source configured');
}

/**
 * Transform raw CSV/API data into structured Site objects
 */
function transformToSites(rawData: any[]): Site[] {
  const sitesMap = new Map<string, Site>();

  rawData.forEach((item) => {
    if (!item.building) return;

    const building = item.building.trim();
    
    if (!sitesMap.has(building)) {
      sitesMap.set(building, {
        building,
        address: item.address || '',
        state: item.state || '',
        city: item.city || '',
        country: item.country || '',
        projects: [],
        assets: [],
      });
    }

    // Add project if projectCode exists
    if (item.projectCode && item.name) {
      const site = sitesMap.get(building)!;
      const existingProject = site.projects?.find(p => p.projectCode === item.projectCode);
      
      if (!existingProject) {
        site.projects = site.projects || [];
        site.projects.push({
          projectCode: item.projectCode,
          name: item.name,
          building,
          description: item.description,
          startDate: item.startDate,
          endDate: item.endDate,
          status: item.status,
        });
      }
    }
  });

  return Array.from(sitesMap.values());
}

/**
 * Transform raw CSV/API data into structured Project objects
 * Creates 5 fixed stages per project (Feasibility, Technical Specification, Tender, Contract Draft, Project Management)
 * Projects have: projectCode (PWXXX), building, state, description
 */
function transformToProjects(rawData: any[]): Project[] {
  const projectsMap = new Map<string, Project>();

  // Fixed 5 stage definitions (all projects have the same stages)
  const createFixedStages = (projectCode: string): ProjectStage[] => {
    const stageNames: Array<{ name: ProjectStageName; order: number }> = [
      { name: 'Feasibility', order: 1 },
      { name: 'Technical Specification', order: 2 },
      { name: 'Tender', order: 3 },
      { name: 'Contract Draft', order: 4 },
      { name: 'Project Management', order: 5 },
    ];

    return stageNames.map((stage) => ({
      id: `${projectCode}-stage-${stage.order}`,
      name: stage.name,
      projectCode,
      files: [],
      order: stage.order,
      description: '',
      status: 'Not Started' as ProjectStageStatus,
      price: 0,
      createdAt: new Date().toISOString(),
    }));
  };

  // Map CSV state names to ProjectState type
  const mapStateFromCSV = (csvState: string): ProjectState => {
    if (!csvState) return 'Victoria'; // Default fallback
    const state = csvState.trim();

    // Direct matches (prefer full state names from CSV)
    switch (state) {
      case 'Victoria':
        return 'Victoria';
      case 'New South Wales':
        return 'NSW';
      case 'Queensland':
        return 'Queensland';
      case 'South Australia':
        return 'South Australia';
      case 'Western Australia':
        return 'Western Australia';
      case 'Northern Territory':
        return 'Northern Territory';
      case 'Tasmania':
        return 'Tasmania';
      case 'ACT':
        return 'ACT';
      case 'New Zealand':
        return 'New Zealand';
      default:
        // Fallback: assume it's already in correct format
        return (state as ProjectState) || 'Victoria';
    }
  };

  rawData.forEach((item) => {
    // Required fields: projectCode, building
    if (!item.projectCode || !item.building) return;

    const projectCode = item.projectCode.trim();
    const building = item.building.trim();

    // Create project only once per projectCode (don't process duplicates)
    if (!projectsMap.has(projectCode)) {
      const now = new Date().toISOString();

      projectsMap.set(projectCode, {
        projectCode,
        building,
        state: mapStateFromCSV(item.state),
        description: item.description || item['Project Description'] || item.name || '',
        status: 'Active', // Default status
        stages: createFixedStages(projectCode),
        notes: [],
        contacts: [],
        createdAt: now,
        updatedAt: now,
        assets: [],
        files: [],
      });
    }
  });

  return Array.from(projectsMap.values());
}

/**
 * Transform raw CSV/API data into structured Asset objects
 */
function transformToAssets(rawData: any[]): Asset[] {
  return rawData
    .filter(item => item.id) // Only include items with an ID
    .map((item) => ({
      id: item.id,
      name: item.name,
      nickname: item.nickname,
      type: item.type as Asset['type'],
      status: item.status as Asset['status'],
      building: item.building?.trim() || '',
      projectCode: item.projectCode,
      floor: item.floor,
      contractor: item.contractor as Asset['contractor'],
      lastService: item.lastService,
      nextMaintenance: item.nextMaintenance,
      installYear: item.installYear ? Number(item.installYear) : undefined,
      warrantyStatus: item.warrantyStatus,
      uptime: item.uptime,
      avgResponseTime: item.avgResponseTime,
      timeToRepair: item.timeToRepair,
      cost: item.cost,
      serviceTickets: item.serviceTickets,
      fileName: item.fileName,
      fileUrl: item.fileUrl,
      fileDateUploaded: item.fileDateUploaded,
      fileSize: item.fileSize,
      ...item, // Include any additional fields
    }));
}

/**
 * Data Service - Main interface for fetching data
 */
export const dataService = {
  /**
   * Fetch all sites from CSV or API
   *
   * NOTE: Mock data is ONLY used during testing.
   * In local development/production, all data comes from CSV files or API.
   */
  async fetchSites(): Promise<Site[]> {
    // Get list of deleted site codes
    const deletedSites = (() => {
      try {
        const stored = localStorage.getItem('_deletedSiteCodes');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    })();

    // ONLY use mock data during testing (VITE_USE_MOCK_DATA controlled by vitest.config.ts)
    if (useMockData()) {
      console.warn('[DataService] Using mock site data - this should only happen during tests');
      return mockSites.filter(s => !deletedSites.includes(s.building));
    }

    // All data in development/production comes from CSV or API
    const rawData = await fetchData<any>({
      csvPath: dataSourceConfig.csvPaths?.sites,
      apiEndpoint: dataSourceConfig.endpoints?.sites,
    });
    return transformToSites(rawData);
  },

  /**
   * Fetch all projects from CSV or API
   *
   * NOTE: Mock data is ONLY used during testing.
   * In local development/production, all data comes from CSV files or API.
   */
  async fetchProjects(): Promise<Project[]> {
    // Get list of deleted project codes
    const deletedProjects = (() => {
      try {
        const stored = localStorage.getItem('_deletedProjectCodes');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    })();

    // ONLY use mock data during testing (VITE_USE_MOCK_DATA controlled by vitest.config.ts)
    if (useMockData()) {
      console.warn('[DataService] Using mock project data - this should only happen during tests');
      return mockProjects.filter(p => !deletedProjects.includes(p.projectCode));
    }

    // All data in development/production comes from CSV or API
    const rawData = await fetchData<any>({
      csvPath: dataSourceConfig.csvPaths?.sites, // Use sites CSV as projects are in the same file
      apiEndpoint: dataSourceConfig.endpoints?.projects,
    });

    const projects = transformToProjects(rawData);
    return projects;
  },

  /**
   * Fetch all assets
   * NOTE: Assets have been removed from LML File Management
   * Keeping this for backward compatibility - returns empty array
   */
  async fetchAssets(): Promise<Asset[]> {
    // Assets are no longer used in LML File Management
    if (useMockData()) {
      return [];
    }

    const rawData = await fetchData<any>({
      csvPath: dataSourceConfig.csvPaths?.assets,
      apiEndpoint: dataSourceConfig.endpoints?.assets,
    });
    return transformToAssets(rawData);
  },

  /**
   * Fetch all contacts
   */
  async fetchContacts(): Promise<Contact[]> {
    const rawData = await fetchData<Contact>({
      csvPath: dataSourceConfig.csvPaths?.contacts,
      apiEndpoint: dataSourceConfig.endpoints?.contacts,
    });
    return rawData;
  },

  /**
   * Fetch complete data hierarchy (sites, projects, assets, contacts)
   */
  async fetchAll(): Promise<DataHierarchy> {
    const [sites, projects, assets, contacts] = await Promise.all([
      this.fetchSites(),
      this.fetchProjects(),
      this.fetchAssets(),
      this.fetchContacts(),
    ]);

    // Link assets to projects and sites
    assets.forEach((asset) => {
      if (asset.projectCode) {
        const project = projects.find(p => p.projectCode === asset.projectCode);
        if (project) {
          project.assets = project.assets || [];
          project.assets.push(asset);
        }
      }

      if (asset.building) {
        const site = sites.find(s => s.building === asset.building);
        if (site) {
          site.assets = site.assets || [];
          site.assets.push(asset);
        }
      }
    });

    // Link projects to sites
    projects.forEach((project) => {
      const site = sites.find(s => s.building === project.building);
      if (site) {
        site.projects = site.projects || [];
        if (!site.projects.find(p => p.projectCode === project.projectCode)) {
          site.projects.push(project);
        }
      }
    });

    return { sites, projects, assets, contacts };
  },

  /**
   * Fetch assets for a specific site
   */
  async fetchAssetsBySite(siteName: string): Promise<Asset[]> {
    const assets = await this.fetchAssets();
    return assets.filter(asset => asset.building === siteName);
  },

  /**
   * Fetch assets for a specific project
   */
  async fetchAssetsByProject(projectCode: string): Promise<Asset[]> {
    const assets = await this.fetchAssets();
    return assets.filter(asset => asset.projectCode === projectCode);
  },

  /**
   * Fetch projects for a specific site
   */
  async fetchProjectsBySite(siteName: string): Promise<Project[]> {
    const projects = await this.fetchProjects();
    return projects.filter(project => project.building === siteName);
  },
};

