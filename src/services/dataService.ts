/**
 * Data Service Layer
 * 
 * Abstracts data fetching from CSV or API.
 * This allows easy switching between data sources without changing component code.
 */

import Papa from 'papaparse';
import { DataSourceConfig, Asset, Site, Project, Contact, DataHierarchy } from '@/types/data';
import { dataSourceConfig } from '@/config/dataSource';

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
 * Generic data fetcher that switches between CSV and API
 */
async function fetchData<T>(config: { csvPath?: string; apiEndpoint?: string }): Promise<T[]> {
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
 * Handles multiple stages per project (grouped by projectCode)
 * Projects have: projectCode (PWXXX), building, description, stage
 */
function transformToProjects(rawData: any[]): Project[] {
  const projectsMap = new Map<string, Project>();

  rawData.forEach((item) => {
    // Required fields: projectCode, building
    if (!item.projectCode || !item.building) return;

    const projectCode = item.projectCode.trim();
    const building = item.building.trim();
    
    if (!projectsMap.has(projectCode)) {
      // Create new project
      projectsMap.set(projectCode, {
        projectCode,
        building,
        description: item.description || item['Project Description'] || item.name || '',
        stages: [],
        assets: [],
        files: [],
      });
    }

    // Add stage if it exists
    const project = projectsMap.get(projectCode)!;
    const stageValue = item.stage || item.Stage;
    
    if (stageValue) {
      // Check if stage already exists
      const stageExists = project.stages?.some(s => s.stage === stageValue);
      if (!stageExists) {
        project.stages = project.stages || [];
        project.stages.push({
          stage: stageValue,
          description: item.stageDescription,
        });
      }
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
   * Fetch all sites
   */
  async fetchSites(): Promise<Site[]> {
    const rawData = await fetchData<any>({
      csvPath: dataSourceConfig.csvPaths?.sites,
      apiEndpoint: dataSourceConfig.endpoints?.sites,
    });
    return transformToSites(rawData);
  },

  /**
   * Fetch all projects
   * Projects are extracted from the same sites_data.csv file
   */
  async fetchProjects(): Promise<Project[]> {
    const rawData = await fetchData<any>({
      csvPath: dataSourceConfig.csvPaths?.sites, // Use sites CSV as projects are in the same file
      apiEndpoint: dataSourceConfig.endpoints?.projects,
    });
    return transformToProjects(rawData);
  },

  /**
   * Fetch all assets
   */
  async fetchAssets(): Promise<Asset[]> {
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

