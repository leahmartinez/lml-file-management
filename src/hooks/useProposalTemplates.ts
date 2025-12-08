import { useState, useCallback, useEffect } from 'react';
import { ProposalTemplate } from '@/types/data';

const STORAGE_KEY = 'proposalTemplates';

export const useProposalTemplates = () => {
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Load templates from localStorage on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }, []);

  const addTemplate = useCallback((template: Omit<ProposalTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTemplate: ProposalTemplate = {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [...templates, newTemplate];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTemplates(updated);
      return newTemplate;
    } catch (error) {
      console.error('Error adding template:', error);
      return null;
    }
  }, [templates]);

  const updateTemplate = useCallback((templateId: string, updates: Partial<ProposalTemplate>) => {
    try {
      const updated = templates.map(t =>
        t.id === templateId
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTemplates(updated);
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      return false;
    }
  }, [templates]);

  const deleteTemplate = useCallback((templateId: string) => {
    try {
      const updated = templates.filter(t => t.id !== templateId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTemplates(updated);
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }, [templates]);

  return {
    templates,
    loading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    loadTemplates,
  };
};
