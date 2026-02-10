import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { useProposals } from '@/hooks/useProposals';
import { useSiteManagement } from '@/hooks/useSiteManagement';
import { useProjectManagement } from '@/hooks/useProjectManagement';
import { useAuth } from '@/hooks/useAuth';
import { useContacts } from '@/hooks/useContacts';
import { useProposalTemplates } from '@/hooks/useProposalTemplates';
import { AddExternalContactModal } from '@/components/contacts/AddExternalContactModal';
import { Proposal, ProposalStatus, Project, Site, ProjectStage, ProjectState, ExternalContact } from '@/types/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, FileText, Search, Check, Edit, Trash2, Building2, Download, Copy, RefreshCw, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Status filter options (drafts are managed in a separate section)
const STATUS_OPTIONS: Array<ProposalStatus | 'All'> = ['All', 'Sent', 'Under Review', 'Accepted', 'Part Acceptance', 'Rejected', 'Expired'];

const Proposals = () => {
  const { user } = useAuth();
  const { proposals, addProposal, updateProposal, updateProposalStatus, deleteProposal, generateProposalNumber, refreshProposals } = useProposals();
  const { sites: sitesData, addSite } = useSiteManagement();
  const { projects: projectsData, addProject, updateProject } = useProjectManagement();
  const { contacts, fetchContacts, createContact, categories, fetchCategories } = useContacts();
  const { templates } = useProposalTemplates();

  const [searchQuery, setSearchQuery] = useState('');
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'All'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateContactModalOpen, setIsCreateContactModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [nextProposalNumber, setNextProposalNumber] = useState('');
  const [selectedStagesForAcceptance, setSelectedStagesForAcceptance] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    contactId: '', // Select from existing contacts
    contactSearch: '', // For autocomplete search
    siteName: '',
    siteSearch: '', // For site autocomplete search
    existingSiteBuilding: '', // Track if using existing site
    siteAddress: '',
    state: '',
    city: '',
    postcode: '',
    description: '',
    estimatedValue: '',
    status: 'Draft' as ProposalStatus,
    notes: '',
  });
  const [proposalStages, setProposalStages] = useState<any[]>([]);
  const [showSiteFields, setShowSiteFields] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);

  const isConsultant = user?.role === 'admin' || user?.role === 'user';

  // Load contacts and refresh proposals on mount
  useEffect(() => {
    // Refresh proposals from localStorage (they're initialized in AuthProvider)
    refreshProposals();

    // Load contacts and categories
    fetchContacts().catch(err => {
      console.error('Error loading contacts on mount:', err);
    });
    fetchCategories().catch(err => {
      console.error('Error loading categories on mount:', err);
    });
  }, [fetchContacts, refreshProposals, fetchCategories]);

  // Filter contacts based on search query for autocomplete
  const filteredContactsForSearch = useMemo(() => {
    if (!formData.contactSearch.trim()) return [];
    const searchLower = formData.contactSearch.toLowerCase();
    return contacts
      .filter(c =>
        c.firstName.toLowerCase().includes(searchLower) ||
        c.lastName.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower)
      )
      .slice(0, 10); // Limit to 10 suggestions
  }, [contacts, formData.contactSearch]);

  // Filter sites based on search query for autocomplete
  const filteredSitesForSearch = useMemo(() => {
    if (!formData.siteSearch.trim()) return [];
    const searchLower = formData.siteSearch.toLowerCase();
    return sitesData
      .filter(s =>
        s.building.toLowerCase().includes(searchLower) ||
        (s.address && s.address.toLowerCase().includes(searchLower)) ||
        (s.city && s.city.toLowerCase().includes(searchLower))
      )
      .slice(0, 10); // Limit to 10 suggestions
  }, [sitesData, formData.siteSearch]);

  // Generate proposal number when opening add modal
  const openAddModal = () => {
    const proposalNum = generateProposalNumber();
    setNextProposalNumber(proposalNum);
    setIsAddModalOpen(true);
  };

  const draftProposals = useMemo(() => {
    return proposals.filter((proposal) => proposal.status === 'Draft');
  }, [proposals]);

  const activeProposals = useMemo(() => {
    return proposals.filter((proposal) => proposal.status !== 'Draft');
  }, [proposals]);

  // Filter and search active proposals (drafts handled separately)
  const filteredProposals = useMemo(() => {
    let filtered = activeProposals;

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.proposalNumber.toLowerCase().includes(query) ||
        p.clientName.toLowerCase().includes(query) ||
        p.siteName.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    // Sort by created date (newest first)
    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [activeProposals, statusFilter, searchQuery]);

  const filteredDrafts = useMemo(() => {
    if (!draftSearchQuery.trim()) {
      return [...draftProposals].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    const query = draftSearchQuery.toLowerCase();
    return draftProposals
      .filter((draft) =>
        draft.proposalNumber.toLowerCase().includes(query) ||
        draft.clientName.toLowerCase().includes(query) ||
        draft.siteName.toLowerCase().includes(query) ||
        draft.description.toLowerCase().includes(query)
      )
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [draftProposals, draftSearchQuery]);

  const getStatusBadgeClass = (status: ProposalStatus) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
      case 'Sent':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
      case 'Accepted':
        return 'bg-green-100 text-green-700 hover:bg-green-100';
      case 'Part Acceptance':
        return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'Rejected':
        return 'bg-red-100 text-red-700 hover:bg-red-100';
      case 'Expired':
        return 'bg-orange-100 text-orange-700 hover:bg-orange-100';
      default:
        return '';
    }
  };

  const resetForm = () => {
    setFormData({
      contactId: '',
      contactSearch: '',
      siteName: '',
      siteSearch: '',
      existingSiteBuilding: '',
      siteAddress: '',
      state: '',
      city: '',
      postcode: '',
      description: '',
      estimatedValue: '',
      status: 'Draft' as ProposalStatus,
      notes: '',
    });
    setProposalStages([]);
    setShowSiteFields(false);
    setShowContactDropdown(false);
    setShowSiteDropdown(false);
  };

  const createStageId = () => {
    return `proposal_stage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  };

  const normalizeProposalStages = (stages: ProjectStage[], projectCode: string): ProjectStage[] => {
    return stages.map((stage, index) => ({
      ...stage,
      id: stage.id || `${projectCode}-stage-${index + 1}`,
      projectCode,
      order: stage.order ?? index + 1,
      status: stage.status || 'Not Started',
      files: stage.files || [],
      units: stage.units || [],
    }));
  };

  const handleAddProposal = (mode: 'draft' | 'active') => {
    const isDraft = mode === 'draft';
    if (!formData.contactId || !formData.siteName.trim() || !formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Contact, site name, and description are required",
        variant: "destructive",
      });
      return;
    }

    // If creating a new site (not using existing), require address fields
    if (!formData.existingSiteBuilding) {
      if (!formData.siteAddress.trim() || !formData.state.trim() || !formData.city.trim() || !formData.postcode.trim()) {
        toast({
          title: "Validation Error",
          description: "For new sites, address, state, city, and postcode are required",
          variant: "destructive",
        });
        return;
      }
    }

    // Get the selected contact
    const selectedContact = contacts.find(c => c.id === formData.contactId);
    if (!selectedContact) {
      toast({
        title: "Error",
        description: "Selected contact not found",
        variant: "destructive",
      });
      return;
    }

    addProposal({
      clientName: `${selectedContact.firstName} ${selectedContact.lastName}`,
      clientContact: selectedContact.email,
      siteName: formData.siteName,
      siteAddress: formData.siteAddress || undefined,
      state: formData.state as ProjectState || undefined,
      city: formData.city || undefined,
      postcode: formData.postcode || undefined,
      description: formData.description,
      estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
      notes: formData.notes || undefined,
      status: isDraft ? 'Draft' : 'Sent',
      stages: proposalStages.length > 0 ? proposalStages : undefined,
      createdBy: user?.email || 'unknown',
    });

    resetForm();
    setIsAddModalOpen(false);
  };

  const handleEditProposal = () => {
    if (!selectedProposal) return;

    updateProposal(selectedProposal.id, {
      siteName: formData.siteName,
      siteAddress: formData.siteAddress || undefined,
      state: formData.state as ProjectState || undefined,
      city: formData.city || undefined,
      postcode: formData.postcode || undefined,
      description: formData.description,
      estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
      status: formData.status,
      stages: proposalStages.length > 0 ? proposalStages : undefined,
      notes: formData.notes || undefined,
    });

    setIsEditModalOpen(false);
    setSelectedProposal(null);
    resetForm();
  };

  const openEditModal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    // Find contact ID from clientContact email
    const contact = contacts.find(c => c.email === proposal.clientContact);
    // Check if site already exists
    const existingSite = sitesData.find(s => s.building === proposal.siteName);
    setFormData({
      contactId: contact?.id || '',
      contactSearch: contact ? `${contact.firstName} ${contact.lastName}` : '',
      siteName: proposal.siteName,
      siteSearch: proposal.siteName,
      existingSiteBuilding: existingSite ? existingSite.building : '',
      siteAddress: proposal.siteAddress || '',
      state: proposal.state || '',
      city: proposal.city || '',
      postcode: proposal.postcode || '',
      description: proposal.description,
      estimatedValue: proposal.estimatedValue?.toString() || '',
      status: proposal.status,
      notes: proposal.notes || '',
    });
    const normalizedStages = (proposal.stages || []).map((stage, index) => ({
      ...stage,
      id: stage.id || createStageId(),
      order: stage.order ?? index + 1,
      status: stage.status || 'Not Started',
      files: stage.files || [],
      units: stage.units || [],
    }));
    setProposalStages(normalizedStages);
    setIsEditModalOpen(true);
  };

  const handleAcceptProposal = () => {
    if (!selectedProposal) return;

    // Validate stage selection if proposal has stages
    if (selectedProposal.stages && selectedProposal.stages.length > 0) {
      if (selectedStagesForAcceptance.length === 0) {
        toast({
          title: "No stages selected",
          description: "Please select at least one stage to accept",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if project already exists (for part acceptance)
    const existingProject = selectedProposal.projectCode
      ? projectsData.find(p => p.projectCode === selectedProposal.projectCode)
      : null;

    if (existingProject) {
      // Project exists - this is additional stage acceptance
      const normalizedStages = normalizeProposalStages(selectedProposal.stages || [], existingProject.projectCode);
      const stagesToAdd = normalizedStages.filter(s =>
        selectedStagesForAcceptance.includes(s.name) &&
        !existingProject.stages.some(es => es.name === s.name)
      );

      if (stagesToAdd.length > 0) {
        // Add stages to existing project
        const updatedStages = [...existingProject.stages, ...stagesToAdd];

        // Update the project with new stages
        const updatedProject: Project = {
          ...existingProject,
          stages: updatedStages,
          updatedAt: new Date().toISOString(),
        };
        updateProject(existingProject.projectCode, updatedProject);

        const allAcceptedStages = [
          ...(selectedProposal.acceptedStageNames || []),
          ...selectedStagesForAcceptance.filter(s => !(selectedProposal.acceptedStageNames || []).includes(s))
        ];

        const allStagesAccepted = selectedProposal.stages?.every(s => allAcceptedStages.includes(s.name));

        updateProposal(selectedProposal.id, {
          acceptedStageNames: allAcceptedStages,
          status: allStagesAccepted ? 'Accepted' : 'Part Acceptance',
          acceptedDate: new Date().toISOString(),
        });

        toast({
          title: "Stages Added",
          description: `${stagesToAdd.length} stage(s) added to project ${existingProject.projectCode}`,
        });
      }

      setIsAcceptModalOpen(false);
      setSelectedProposal(null);
      setSelectedStagesForAcceptance([]);
      return;
    }

    // No existing project - create new one
    // Check if site exists
    const existingSite = sitesData.find(s =>
      s.building.toLowerCase() === selectedProposal.siteName.toLowerCase()
    );

    let site: Site;
    if (!existingSite) {
      // Create new site
      const newSite: Site = {
        building: selectedProposal.siteName,
        address: selectedProposal.siteAddress,
        state: selectedProposal.state,
        city: selectedProposal.city,
        postcode: selectedProposal.postcode,
        projects: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addSite(newSite);
      site = newSite;

      toast({
        title: "Site Created",
        description: `Site "${selectedProposal.siteName}" has been created`,
      });
    } else {
      site = existingSite;
    }

    // Generate project code based on state
    const statePrefix = selectedProposal.state === 'Victoria' ? 'PV' :
                       selectedProposal.state === 'NSW' ? 'PN' :
                       selectedProposal.state === 'South Australia' ? 'PSA' :
                       selectedProposal.state === 'Queensland' ? 'PQ' : 'P';

    const existingProjectsInState = projectsData.filter(p =>
      p.projectCode.startsWith(statePrefix)
    );
    const nextNumber = existingProjectsInState.length + 1;
    const projectCode = `${statePrefix}${String(nextNumber).padStart(4, '0')}`;

    // Filter stages based on selection
    const normalizedStages = normalizeProposalStages(selectedProposal.stages || [], projectCode);
    const stagesToInclude = normalizedStages.filter(s => selectedStagesForAcceptance.includes(s.name));

    // Determine if all stages were accepted
    const allStagesAccepted = !selectedProposal.stages ||
      selectedProposal.stages.length === 0 ||
      selectedStagesForAcceptance.length === selectedProposal.stages.length;

    // Create new project with selected stages from proposal
    const newProject: Project = {
      projectCode,
      building: site.building,
      description: selectedProposal.description,
      status: 'Active',
      state: selectedProposal.state || 'Victoria',
      stages: stagesToInclude,
      notes: [],
      proposalId: selectedProposal.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.email,
    };

    const success = addProject(newProject);
    if (success) {
      // Update proposal with project code and mark status
      updateProposal(selectedProposal.id, {
        projectCode,
        status: allStagesAccepted ? 'Accepted' : 'Part Acceptance',
        acceptedStageNames: selectedStagesForAcceptance,
        acceptedDate: new Date().toISOString(),
      });

      toast({
        title: "Proposal Accepted",
        description: `Project ${projectCode} has been created from proposal ${selectedProposal.proposalNumber}`,
      });

      setIsAcceptModalOpen(false);
      setSelectedProposal(null);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const pending = activeProposals.filter(p => ['Sent', 'Under Review'].includes(p.status)).length;
    const accepted = activeProposals.filter(p => p.status === 'Accepted' || p.status === 'Part Acceptance').length;
    const totalValue = activeProposals.reduce((sum, p) => {
      if (p.stages) {
        return sum + p.stages.reduce((stageSum, s) => stageSum + (s.price || 0), 0);
      }
      return sum;
    }, 0);
    return { total: activeProposals.length, pending, accepted, totalValue };
  }, [activeProposals]);

  // Get count for each status
  const getStatusCount = (status: ProposalStatus | 'All') => {
    if (status === 'All') return activeProposals.length;
    return activeProposals.filter(p => p.status === status).length;
  };

  // Copy proposals to clipboard
  const handleCopyToClipboard = () => {
    const rows = filteredProposals.map(p => ({
      'Proposal #': p.proposalNumber,
      'Client': p.clientName,
      'Site': p.siteName,
      'State': p.state || '',
      'Description': p.description,
      'Price': p.stages?.reduce((sum, s) => sum + (s.price || 0), 0) || 0,
      'Status': p.status,
      'Created': new Date(p.createdAt).toLocaleDateString(),
    }));

    const headers = Object.keys(rows[0] || {});
    const csvContent = [
      headers.join('\t'),
      ...rows.map(row => headers.map(h => row[h as keyof typeof row]).join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(csvContent);
    toast({
      title: "Copied",
      description: `${filteredProposals.length} proposal(s) copied to clipboard`,
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    const rows = filteredProposals.map(p => ({
      'Proposal #': p.proposalNumber,
      'Client': p.clientName,
      'Site': p.siteName,
      'State': p.state || '',
      'Description': p.description.replace(/,/g, ';'),
      'Price': p.stages?.reduce((sum, s) => sum + (s.price || 0), 0) || 0,
      'Status': p.status,
      'Created': new Date(p.createdAt).toLocaleDateString(),
    }));

    const headers = Object.keys(rows[0] || {});
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="flex flex-col">
        {/* Page Header */}
        <div className="py-6 px-4">
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">Proposals</h1>
                <p className="text-muted-foreground mt-1">
                  Track proposals and convert them to projects
                </p>
              </div>
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-2 mb-8 border-b overflow-x-auto">
            {STATUS_OPTIONS.map((status) => {
              const count = getStatusCount(status);
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                    statusFilter === status
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {status === 'All' ? 'All Proposals' : status}
                  <span className="ml-2 text-xs font-semibold">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto py-6 px-4 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Proposals</p>
                <div className="text-4xl font-bold text-foreground">{stats.total}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
                <div className="text-4xl font-bold text-foreground">{stats.pending}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accepted</p>
                <div className="text-4xl font-bold text-green-600">{stats.accepted}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Value</p>
                <div className="text-3xl font-bold text-primary">${stats.totalValue.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search proposals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshProposals()}
                title="Refresh proposals"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToClipboard}
                disabled={filteredProposals.length === 0}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={filteredProposals.length === 0}
                title="Export as CSV"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {isConsultant && (
                <Button onClick={openAddModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Proposal
                </Button>
              )}
            </div>
          </div>

          {/* Proposals Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {statusFilter === 'All' ? 'All Proposals' : statusFilter} ({filteredProposals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProposals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No proposals found</p>
                  {isConsultant && statusFilter === 'All' && (
                    <Button variant="outline" className="mt-4" onClick={openAddModal}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Proposal
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table className="border-collapse w-full">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="border-b border-r border-border/30 font-semibold">Proposal #</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold">Client</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold">Site</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold max-w-[200px]">Description</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold w-28 text-right">Value</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold w-32">Status</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold w-28">Created</TableHead>
                        {isConsultant && <TableHead className="border-b border-border/30 font-semibold w-28 text-center">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProposals.map((proposal) => (
                        <TableRow
                          key={proposal.id}
                          className="cursor-pointer hover:bg-muted/50 border-b border-border/30 transition-colors"
                          onClick={() => {
                            setSelectedProposal(proposal);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <TableCell className="border-r border-border/30 font-medium">{proposal.proposalNumber}</TableCell>
                          <TableCell className="border-r border-border/30">
                            {proposal.clientContact ? (
                              (() => {
                                const clientContact = contacts.find(c => c.email === proposal.clientContact || `${c.firstName} ${c.lastName}` === proposal.clientName);
                                return clientContact ? (
                                  <span className="font-medium">{clientContact.firstName} {clientContact.lastName}</span>
                                ) : (
                                  <span className="font-medium">{proposal.clientName}</span>
                                );
                              })()
                            ) : (
                              <span className="font-medium">{proposal.clientName}</span>
                            )}
                          </TableCell>
                          <TableCell className="border-r border-border/30">
                            <div>
                              <div className="font-medium">{proposal.siteName}</div>
                              {proposal.state && (
                                <div className="text-xs text-muted-foreground">{proposal.state}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="border-r border-border/30 max-w-[200px]">
                            <span className="line-clamp-2 text-sm">{proposal.description}</span>
                          </TableCell>
                          <TableCell className="border-r border-border/30 text-right font-medium">
                            {proposal.stages && proposal.stages.some(s => s.price !== undefined) ? (
                              <span className="text-primary">
                                ${proposal.stages.reduce((sum, s) => sum + (s.price || 0), 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="border-r border-border/30">
                            <Badge variant="outline" className={getStatusBadgeClass(proposal.status)}>
                              {proposal.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-r border-border/30 text-sm">
                            {new Date(proposal.createdAt).toLocaleDateString()}
                          </TableCell>
                          {isConsultant && (
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1 justify-center">
                                {(proposal.status === 'Sent' || proposal.status === 'Under Review' || proposal.status === 'Part Acceptance') && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProposal(proposal);
                                      if (proposal.stages && proposal.stages.length > 0) {
                                        setSelectedStagesForAcceptance(proposal.acceptedStageNames || []);
                                      } else {
                                        setSelectedStagesForAcceptance([]);
                                      }
                                      setIsAcceptModalOpen(true);
                                    }}
                                    title={proposal.status === 'Part Acceptance' ? "Accept More Stages" : "Accept and Create Project"}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(proposal);
                                  }}
                                  title="Edit"
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Delete proposal ${proposal.proposalNumber}?`)) {
                                      deleteProposal(proposal.id);
                                    }
                                  }}
                                  title="Delete"
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Drafts Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">
                  Drafts ({filteredDrafts.length})
                </CardTitle>
                <div className="w-full sm:max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search drafts..."
                      value={draftSearchQuery}
                      onChange={(e) => setDraftSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDrafts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No drafts found</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table className="border-collapse w-full">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="border-b border-r border-border/30 font-semibold">Proposal #</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold">Client</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold">Site</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold max-w-[200px]">Description</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold w-28 text-right">Value</TableHead>
                        <TableHead className="border-b border-r border-border/30 font-semibold w-28">Created</TableHead>
                        {isConsultant && <TableHead className="border-b border-border/30 font-semibold w-24 text-center">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDrafts.map((proposal) => (
                        <TableRow
                          key={proposal.id}
                          className="cursor-pointer hover:bg-muted/50 border-b border-border/30 transition-colors"
                          onClick={() => {
                            setSelectedProposal(proposal);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <TableCell className="border-r border-border/30 font-medium">{proposal.proposalNumber}</TableCell>
                          <TableCell className="border-r border-border/30">
                            {proposal.clientContact ? (
                              (() => {
                                const clientContact = contacts.find(c => c.email === proposal.clientContact || `${c.firstName} ${c.lastName}` === proposal.clientName);
                                return clientContact ? (
                                  <span className="font-medium">{clientContact.firstName} {clientContact.lastName}</span>
                                ) : (
                                  <span className="font-medium">{proposal.clientName}</span>
                                );
                              })()
                            ) : (
                              <span className="font-medium">{proposal.clientName}</span>
                            )}
                          </TableCell>
                          <TableCell className="border-r border-border/30">
                            <div>
                              <div className="font-medium">{proposal.siteName}</div>
                              {proposal.state && (
                                <div className="text-xs text-muted-foreground">{proposal.state}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="border-r border-border/30 max-w-[200px]">
                            <span className="line-clamp-2 text-sm">{proposal.description}</span>
                          </TableCell>
                          <TableCell className="border-r border-border/30 text-right font-medium">
                            {proposal.stages && proposal.stages.some(s => s.price !== undefined) ? (
                              <span className="text-primary">
                                ${proposal.stages.reduce((sum, s) => sum + (s.price || 0), 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="border-r border-border/30 text-sm">
                            {new Date(proposal.createdAt).toLocaleDateString()}
                          </TableCell>
                          {isConsultant && (
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1 justify-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(proposal);
                                  }}
                                  title="Edit"
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Delete draft ${proposal.proposalNumber}?`)) {
                                      deleteProposal(proposal.id);
                                    }
                                  }}
                                  title="Delete"
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Add/Edit Proposal Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedProposal(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditModalOpen ? 'Edit Proposal' : 'New Proposal'}</DialogTitle>
            <DialogDescription>
              {isEditModalOpen ? 'Update proposal details' : 'Create a new proposal for a potential project'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isEditModalOpen && (
              <div className="p-3 bg-muted rounded-md">
                <Label className="text-sm font-medium">Proposal Number</Label>
                <p className="text-lg font-bold text-primary mt-1">{nextProposalNumber}</p>
                <p className="text-xs text-muted-foreground mt-1">Auto-generated upon creation</p>
              </div>
            )}

            <div className="relative">
              <Label>Client Contact *</Label>
              {isEditModalOpen && selectedProposal ? (
                <p className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded">
                  {formData.contactSearch}
                </p>
              ) : (
                <>
                  <div className="mt-2">
                    <Input
                      value={formData.contactSearch}
                      onChange={(e) => {
                        setFormData({ ...formData, contactSearch: e.target.value });
                      }}
                      placeholder="Search contacts..."
                      autoComplete="off"
                      className="mb-4"
                    />
                  </div>
                  {/* Contact Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 border rounded-md bg-muted/30">
                    {/* Create New Contact Button - always shown first */}
                    <button
                      type="button"
                      onClick={() => setIsCreateContactModalOpen(true)}
                      className="p-3 rounded-lg border-2 border-dashed border-primary/50 text-left transition-all hover:border-primary hover:bg-primary/5 bg-white"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserPlus className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-primary">Create New Contact</div>
                          <div className="text-xs text-muted-foreground">Add a new client contact</div>
                        </div>
                      </div>
                    </button>

                    {filteredContactsForSearch.length > 0 ? (
                      filteredContactsForSearch.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              contactId: contact.id,
                              contactSearch: `${contact.firstName} ${contact.lastName}`
                            });
                          }}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            formData.contactId === contact.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50 bg-white'
                          }`}
                        >
                          <div className="font-semibold text-sm">{contact.firstName} {contact.lastName}</div>
                          <div className="text-xs text-muted-foreground">{contact.position}</div>
                          {contact.email && <div className="text-xs text-muted-foreground truncate">{contact.email}</div>}
                          {contact.category && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {contact.category}
                            </Badge>
                          )}
                        </button>
                      ))
                    ) : formData.contactSearch.trim() ? (
                      <div className="p-3 rounded-lg border border-muted bg-muted/50 text-center">
                        <p className="text-sm text-muted-foreground">No contacts match "{formData.contactSearch}"</p>
                        <p className="text-xs text-muted-foreground mt-1">Use the button above to create a new contact</p>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            {/* Site Autocomplete */}
            <div className="relative">
              <Label htmlFor="siteSearch">Site Name *</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="siteSearch"
                    value={formData.siteSearch}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        siteSearch: e.target.value,
                        siteName: e.target.value,
                        existingSiteBuilding: '' // Clear existing site when typing
                      });
                      setShowSiteDropdown(true);
                    }}
                    onFocus={(e) => {
                      // If existing site is selected, clear it and select all text for easy replacement
                      if (formData.existingSiteBuilding) {
                        e.target.select();
                        setFormData({
                          ...formData,
                          existingSiteBuilding: '',
                          siteAddress: '',
                          state: '',
                          city: '',
                          postcode: ''
                        });
                      }
                      setShowSiteDropdown(true);
                    }}
                    onBlur={() => {
                      // Hide dropdown after a short delay to allow click events to fire
                      setTimeout(() => setShowSiteDropdown(false), 200);
                    }}
                    placeholder="Start typing to search existing sites or enter new site name..."
                    autoComplete="off"
                  />
                  {/* Autocomplete suggestions */}
                  {showSiteDropdown && (formData.siteSearch.length > 0 || filteredSitesForSearch.length > 0) && !formData.existingSiteBuilding && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredSitesForSearch.length > 0 ? (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted">
                            Existing Sites
                          </div>
                          {filteredSitesForSearch.map((site) => (
                            <button
                              key={site.building}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                // Auto-populate all fields from existing site
                                setFormData({
                                  ...formData,
                                  siteSearch: site.building,
                                  siteName: site.building,
                                  existingSiteBuilding: site.building,
                                  siteAddress: site.address || '',
                                  state: site.state || '',
                                  city: site.city || '',
                                  postcode: site.postcode || '',
                                });
                                setShowSiteDropdown(false);
                              }}
                            >
                              <div className="font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                {site.building}
                              </div>
                              {site.address && <div className="text-sm text-muted-foreground">{site.address}</div>}
                              {site.city && site.state && (
                                <div className="text-xs text-muted-foreground">{site.city}, {site.state}</div>
                              )}
                            </button>
                          ))}
                          {formData.siteSearch.trim() && (
                            <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-blue-50">
                              💡 Select an existing site above or keep typing to create a new site
                            </div>
                          )}
                        </>
                      ) : formData.siteSearch.trim() ? (
                        <div className="px-3 py-2 text-sm">
                          <div className="font-medium text-primary">Create new site: "{formData.siteSearch}"</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            No existing sites found. Fill in the address details below.
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                {formData.existingSiteBuilding && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Existing Site
                  </Badge>
                )}
              </div>
              {formData.existingSiteBuilding && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Using existing site. Address fields are auto-filled and read-only.
                </p>
              )}
            </div>

            {/* Site Address Fields - read-only if existing site selected */}
            <div>
              <Label htmlFor="siteAddress">Site Address {!formData.existingSiteBuilding && '*'}</Label>
              <Input
                id="siteAddress"
                value={formData.siteAddress}
                onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                placeholder="123 Main Street"
                disabled={!!formData.existingSiteBuilding}
                className={formData.existingSiteBuilding ? 'bg-muted' : ''}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City {!formData.existingSiteBuilding && '*'}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Sydney"
                  disabled={!!formData.existingSiteBuilding}
                  className={formData.existingSiteBuilding ? 'bg-muted' : ''}
                />
              </div>
              <div>
                <Label htmlFor="state">State {!formData.existingSiteBuilding && '*'}</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                  disabled={!!formData.existingSiteBuilding}
                >
                  <SelectTrigger id="state" className={formData.existingSiteBuilding ? 'bg-muted' : ''}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Victoria">Victoria</SelectItem>
                    <SelectItem value="NSW">NSW</SelectItem>
                    <SelectItem value="Queensland">Queensland</SelectItem>
                    <SelectItem value="South Australia">South Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="postcode">Postcode {!formData.existingSiteBuilding && '*'}</Label>
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  placeholder="2000"
                  disabled={!!formData.existingSiteBuilding}
                  className={formData.existingSiteBuilding ? 'bg-muted' : ''}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the scope of work..."
                rows={4}
              />
            </div>

            {!isEditModalOpen && templates.length > 0 && (
              <div>
                <Label htmlFor="template">Use Template (Optional)</Label>
                <Select
                  onValueChange={(templateId) => {
                    const selectedTemplate = templates.find(t => t.id === templateId);
                    if (selectedTemplate) {
                      setProposalStages(selectedTemplate.stages.map(stage => ({
                        name: stage.name,
                        status: 'Not Started',
                        units: [],
                        files: [],
                        description: '',
                        dueDate: '',
                        price: stage.price,
                      })));
                    }
                  }}
                >
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select a template to auto-populate stages..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.stages.length} stage{template.stages.length !== 1 ? 's' : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecting a template will populate the stages section below with the template's stages.
                </p>
              </div>
            )}

            {isEditModalOpen && (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as ProposalStatus })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Part Acceptance">Part Acceptance</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Proposed Stages</Label>
              <div className="space-y-3 mt-2">
                {proposalStages.map((stage, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-muted-foreground mb-2 block">Stage Name</Label>
                        <Input
                          type="text"
                          value={stage.name}
                          onChange={(e) => {
                            const updatedStages = [...proposalStages];
                            updatedStages[index].name = e.target.value;
                            setProposalStages(updatedStages);
                          }}
                          placeholder="e.g., Design, Engineering, etc."
                          className="border-muted-foreground/20"
                        />
                      </div>
                      <div className="w-40">
                        <Label className="text-sm font-medium text-muted-foreground mb-2 block">Price ($)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={stage.price || ''}
                          onChange={(e) => {
                            const updatedStages = [...proposalStages];
                            updatedStages[index].price = e.target.value ? parseFloat(e.target.value) : undefined;
                            setProposalStages(updatedStages);
                          }}
                          step="0.01"
                          min="0"
                          className="border-muted-foreground/20"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProposalStages(proposalStages.filter((_, i) => i !== index));
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    setProposalStages([...proposalStages, {
                      id: createStageId(),
                      name: '',
                      status: 'Not Started',
                      units: [],
                      files: [],
                      description: '',
                      dueDate: '',
                      price: undefined,
                    }]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stage
                </Button>

                {proposalStages.length === 0 && (
                  <div className="p-3 border border-dashed rounded-lg bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">No stages added yet. Add stages to break down your proposal into components.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Total Price Summary */}
            {proposalStages.length > 0 && proposalStages.some(s => s.price !== undefined) && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total Price:</span>
                  <span className="text-2xl font-bold text-primary">${(proposalStages.reduce((sum, s) => sum + (s.price || 0), 0)).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              setSelectedProposal(null);
              resetForm();
            }}>
              Cancel
            </Button>
            {isEditModalOpen ? (
              <Button onClick={handleEditProposal}>
                Update Proposal
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleAddProposal('draft')}>
                  Save Draft
                </Button>
                <Button onClick={() => handleAddProposal('active')}>
                  Create Proposal
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Proposal Modal */}
      <Dialog open={isAcceptModalOpen} onOpenChange={(open) => {
        setIsAcceptModalOpen(open);
        if (!open) {
          setSelectedProposal(null);
          setSelectedStagesForAcceptance([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProposal?.status === 'Part Acceptance' ? 'Accept More Stages' : 'Accept Proposal'}</DialogTitle>
            <DialogDescription>
              {selectedProposal?.projectCode
                ? `Add more stages to project ${selectedProposal.projectCode}`
                : `This will create a new project${selectedProposal && !sitesData.find(s => s.building.toLowerCase() === selectedProposal.siteName.toLowerCase()) ? ' and site' : ''} from this proposal`}
            </DialogDescription>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Proposal</Label>
                <p className="font-medium">{selectedProposal.proposalNumber}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Client</Label>
                {selectedProposal.clientContact ? (
                  (() => {
                    const clientContact = contacts.find(c => c.email === selectedProposal.clientContact || `${c.firstName} ${c.lastName}` === selectedProposal.clientName);
                    return clientContact ? (
                      <div className="p-3 rounded-lg border-2 border-primary bg-primary/5 mt-2">
                        <div className="font-semibold">{clientContact.firstName} {clientContact.lastName}</div>
                        <div className="text-sm text-muted-foreground">{clientContact.position}</div>
                        {clientContact.email && <div className="text-sm text-muted-foreground">{clientContact.email}</div>}
                        {clientContact.category && (
                          <Badge variant="outline" className="text-xs mt-2">
                            {clientContact.category}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2">{selectedProposal.clientName}</p>
                    );
                  })()
                ) : (
                  <p className="mt-2">{selectedProposal.clientName}</p>
                )}
              </div>

              {/* Stage Selection */}
              {selectedProposal.stages && selectedProposal.stages.length > 0 && (
                <div>
                  <Label>Select Stages to Accept</Label>
                  <div className="space-y-2 mt-2 border rounded p-3 max-h-80 overflow-y-auto">
                    {selectedProposal.stages.map((stage) => {
                      const isAlreadyAccepted = selectedProposal.acceptedStageNames?.includes(stage.name);
                      const isSelected = selectedStagesForAcceptance.includes(stage.name);
                      return (
                        <div key={stage.name} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50">
                          <input
                            type="checkbox"
                            id={`stage-${stage.name}`}
                            checked={isSelected || isAlreadyAccepted}
                            disabled={isAlreadyAccepted}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStagesForAcceptance([...selectedStagesForAcceptance, stage.name]);
                              } else {
                                setSelectedStagesForAcceptance(selectedStagesForAcceptance.filter(s => s !== stage.name));
                              }
                            }}
                            className="h-4 w-4 mt-0.5"
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <label htmlFor={`stage-${stage.name}`} className="text-sm flex-1 cursor-pointer">
                              {stage.name}
                              {isAlreadyAccepted && <span className="ml-2 text-xs text-green-600">(Already accepted)</span>}
                            </label>
                            {stage.price !== undefined && (
                              <span className="text-sm font-medium text-primary ml-2">${stage.price.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedStagesForAcceptance.length} of {selectedProposal.stages.length - (selectedProposal.acceptedStageNames?.length || 0)} remaining stages selected
                  </p>
                  {selectedStagesForAcceptance.length > 0 && selectedProposal.stages.some(s => selectedStagesForAcceptance.includes(s.name) && s.price !== undefined) && (
                    <div className="mt-3 p-2 bg-primary/10 rounded border border-primary/20 flex justify-between items-center">
                      <span className="text-sm font-semibold">Selected Stages Total:</span>
                      <span className="font-bold text-primary">
                        ${selectedProposal.stages
                          .filter(s => selectedStagesForAcceptance.includes(s.name))
                          .reduce((sum, s) => sum + (s.price || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAcceptModalOpen(false);
              setSelectedProposal(null);
              setSelectedStagesForAcceptance([]);
            }}>
              Cancel
            </Button>
            <Button onClick={handleAcceptProposal} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              {selectedProposal?.projectCode ? 'Add Stages' : 'Accept & Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proposal Details</DialogTitle>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Proposal Number</Label>
                  <p className="font-medium">{selectedProposal.proposalNumber}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge variant="outline" className={getStatusBadgeClass(selectedProposal.status)}>
                    {selectedProposal.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Client</Label>
                {selectedProposal.clientContact ? (
                  (() => {
                    const clientContact = contacts.find(c => c.email === selectedProposal.clientContact || `${c.firstName} ${c.lastName}` === selectedProposal.clientName);
                    return clientContact ? (
                      <div className="p-3 rounded-lg border-2 border-primary bg-primary/5 mt-2">
                        <div className="font-semibold">{clientContact.firstName} {clientContact.lastName}</div>
                        <div className="text-sm text-muted-foreground">{clientContact.position}</div>
                        {clientContact.email && <div className="text-sm text-muted-foreground">{clientContact.email}</div>}
                        {clientContact.category && (
                          <Badge variant="outline" className="text-xs mt-2">
                            {clientContact.category}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2">{selectedProposal.clientName}</p>
                    );
                  })()
                ) : (
                  <p className="mt-2">{selectedProposal.clientName}</p>
                )}
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Site</Label>
                <p className="mt-2">{selectedProposal.siteName}</p>
                {selectedProposal.state && <p className="text-sm text-muted-foreground">{selectedProposal.state}</p>}
              </div>


              <div>
                <Label className="text-sm text-muted-foreground">Description</Label>
                <p className="text-sm">{selectedProposal.description}</p>
              </div>

              {selectedProposal.projectCode && (
                <div>
                  <Label className="text-sm text-muted-foreground">Linked Project</Label>
                  <p className="font-medium text-primary">{selectedProposal.projectCode}</p>
                </div>
              )}

              {selectedProposal.stages && selectedProposal.stages.length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Stages ({selectedProposal.acceptedStageNames?.length || 0}/{selectedProposal.stages.length} accepted)</Label>
                  <div className="space-y-2 mt-2 border rounded p-3 bg-muted/30">
                    {selectedProposal.stages.map((stage) => {
                      const isAccepted = selectedProposal.acceptedStageNames?.includes(stage.name);
                      return (
                        <div key={stage.name} className="flex items-center justify-between text-sm pb-2 border-b last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span className={isAccepted ? "text-green-600" : "text-muted-foreground"}>
                              {isAccepted ? "✓" : "○"}
                            </span>
                            <span>{stage.name}</span>
                          </div>
                          {stage.price !== undefined && (
                            <span className="font-medium text-primary">${stage.price.toFixed(2)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedProposal.stages.some(s => s.price !== undefined) && (
                    <div className="mt-3 p-3 bg-primary/10 rounded border border-primary/20 flex justify-between items-center">
                      <span className="font-semibold">Total:</span>
                      <span className="text-lg font-bold text-primary">
                        ${selectedProposal.stages.reduce((sum, s) => sum + (s.price || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedProposal.notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Notes</Label>
                  <p className="text-sm">{selectedProposal.notes}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Created {new Date(selectedProposal.createdAt).toLocaleDateString()} by {selectedProposal.createdBy}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDetailModalOpen(false);
              setSelectedProposal(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Contact Modal */}
      <AddExternalContactModal
        isOpen={isCreateContactModalOpen}
        onClose={() => setIsCreateContactModalOpen(false)}
        categories={categories}
        onAdd={async (contactData) => {
          try {
            const newContact = await createContact(contactData);
            if (newContact) {
              // Auto-select the newly created contact
              setFormData({
                ...formData,
                contactId: newContact.id,
                contactSearch: `${newContact.firstName} ${newContact.lastName}`
              });
              toast({
                title: "Contact Created",
                description: `${newContact.firstName} ${newContact.lastName} has been added and selected`,
              });
            }
            setIsCreateContactModalOpen(false);
          } catch (error) {
            console.error('Error creating contact:', error);
            toast({
              title: "Error",
              description: "Failed to create contact",
              variant: "destructive",
            });
          }
        }}
      />
    </div>
  );
};

export default Proposals;
