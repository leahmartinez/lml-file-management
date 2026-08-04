import { useState, useCallback } from 'react';
import { JobType } from '@/types/data';

const JOB_TYPES_STORAGE_KEY = 'lml_job_types';

// Initialize with some default job types
const DEFAULT_JOB_TYPES: JobType[] = [
  {
    id: 'jt_1',
    name: 'Lift Upgrade',
    description: 'Complete lift system upgrade',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'jt_2',
    name: 'Maintenance Contract',
    description: 'Ongoing maintenance and inspection',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'jt_3',
    name: 'Feasibility Study',
    description: 'Initial site assessment and feasibility analysis',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'jt_4',
    name: 'Compliance Inspection',
    description: 'Safety and compliance inspection',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'jt_5',
    name: 'Modernization',
    description: 'Modernization of existing lift systems',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'jt_6',
    name: 'New Installation',
    description: 'Installation of new lift systems',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Hook for managing job types
 * Stores job types in localStorage
 * In production, this would call an API endpoint
 */
export const useJobTypes = () => {
  const [jobTypes, setJobTypes] = useState<JobType[]>(() => {
    const stored = localStorage.getItem(JOB_TYPES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    } else {
      // Initialize with defaults
      localStorage.setItem(JOB_TYPES_STORAGE_KEY, JSON.stringify(DEFAULT_JOB_TYPES));
      return DEFAULT_JOB_TYPES;
    }
  });

  /**
   * Get active job types only
   */
  const getActiveJobTypes = useCallback((): JobType[] => {
    return jobTypes.filter(jt => jt.isActive);
  }, [jobTypes]);

  /**
   * Get job type by ID
   */
  const getJobTypeById = useCallback((id: string): JobType | undefined => {
    return jobTypes.find(jt => jt.id === id);
  }, [jobTypes]);

  /**
   * Add new job type (admin only in production)
   */
  const addJobType = useCallback((name: string, description?: string) => {
    const newJobType: JobType = {
      id: `jt_${Date.now()}`,
      name,
      description,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...jobTypes, newJobType];
    setJobTypes(updated);
    localStorage.setItem(JOB_TYPES_STORAGE_KEY, JSON.stringify(updated));

    return newJobType;
  }, [jobTypes]);

  /**
   * Update job type
   */
  const updateJobType = useCallback((id: string, updates: Partial<JobType>) => {
    const updated = jobTypes.map(jt =>
      jt.id === id
        ? { ...jt, ...updates, updatedAt: new Date().toISOString() }
        : jt
    );
    setJobTypes(updated);
    localStorage.setItem(JOB_TYPES_STORAGE_KEY, JSON.stringify(updated));
  }, [jobTypes]);

  /**
   * Deactivate job type (soft delete)
   */
  const deactivateJobType = useCallback((id: string) => {
    updateJobType(id, { isActive: false });
  }, [updateJobType]);

  return {
    jobTypes,
    activeJobTypes: getActiveJobTypes(),
    getJobTypeById,
    addJobType,
    updateJobType,
    deactivateJobType,
  };
};
