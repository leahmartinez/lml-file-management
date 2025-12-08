import { useState, useCallback } from 'react';
import { Proposal, ProposalStatus, ProjectState } from '@/types/data';
import { toast } from '@/hooks/use-toast';

const PROPOSALS_STORAGE_KEY = 'liftwatch_proposals';

/**
 * Hook for managing proposals
 * Stores proposals in localStorage
 */
export const useProposals = () => {
  const [proposals, setProposals] = useState<Proposal[]>(() => {
    const stored = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  /**
   * Generate next proposal number
   */
  const generateProposalNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const existingProposals = proposals.filter(p =>
      p.proposalNumber.startsWith(`PROP-${year}`)
    );
    const nextNumber = existingProposals.length + 1;
    return `PROP-${year}-${String(nextNumber).padStart(3, '0')}`;
  }, [proposals]);

  /**
   * Add new proposal
   */
  const addProposal = useCallback((
    proposalData: Omit<Proposal, 'id' | 'proposalNumber' | 'createdAt' | 'updatedAt'>
  ) => {
    const newProposal: Proposal = {
      ...proposalData,
      id: `proposal_${Date.now()}`,
      proposalNumber: generateProposalNumber(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...proposals, newProposal];
    setProposals(updated);
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(updated));

    toast({
      title: "Success",
      description: `Proposal ${newProposal.proposalNumber} has been created`,
    });

    return newProposal;
  }, [proposals, generateProposalNumber]);

  /**
   * Update proposal
   */
  const updateProposal = useCallback((id: string, updates: Partial<Proposal>) => {
    const updated = proposals.map(p =>
      p.id === id
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    );
    setProposals(updated);
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(updated));

    toast({
      title: "Success",
      description: "Proposal has been updated",
    });
  }, [proposals]);

  /**
   * Update proposal status
   */
  const updateProposalStatus = useCallback((id: string, status: ProposalStatus) => {
    const updates: Partial<Proposal> = { status };

    // Set date fields based on status
    if (status === 'Sent' && !proposals.find(p => p.id === id)?.sentDate) {
      updates.sentDate = new Date().toISOString();
    } else if (status === 'Accepted') {
      updates.acceptedDate = new Date().toISOString();
    } else if (status === 'Rejected') {
      updates.rejectedDate = new Date().toISOString();
    }

    updateProposal(id, updates);
  }, [proposals, updateProposal]);

  /**
   * Delete proposal
   */
  const deleteProposal = useCallback((id: string) => {
    const updated = proposals.filter(p => p.id !== id);
    setProposals(updated);
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(updated));

    toast({
      title: "Success",
      description: "Proposal has been deleted",
    });
  }, [proposals]);

  /**
   * Get proposal by ID
   */
  const getProposal = useCallback((id: string): Proposal | undefined => {
    return proposals.find(p => p.id === id);
  }, [proposals]);

  /**
   * Get proposals by status
   */
  const getProposalsByStatus = useCallback((status: ProposalStatus): Proposal[] => {
    return proposals.filter(p => p.status === status);
  }, [proposals]);

  /**
   * Get proposals by state
   */
  const getProposalsByState = useCallback((state: ProjectState): Proposal[] => {
    return proposals.filter(p => p.state === state);
  }, [proposals]);

  /**
   * Refresh proposals from localStorage (handles race conditions during initialization)
   */
  const refreshProposals = useCallback(() => {
    try {
      const stored = localStorage.getItem(PROPOSALS_STORAGE_KEY);
      const freshProposals = stored ? JSON.parse(stored) : [];
      setProposals(freshProposals);
    } catch (err) {
      console.error('Error refreshing proposals from localStorage:', err);
    }
  }, []);

  return {
    proposals,
    addProposal,
    updateProposal,
    updateProposalStatus,
    deleteProposal,
    getProposal,
    getProposalsByStatus,
    getProposalsByState,
    generateProposalNumber,
    refreshProposals,
  };
};
