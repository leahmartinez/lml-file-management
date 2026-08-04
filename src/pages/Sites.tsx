import { useState, useMemo, useEffect, useRef, Suspense, lazy } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import SiteCard from "@/components/site-files/SiteCard";
import ProjectCard from "@/components/site-files/ProjectCard";
import { SiteListView } from "@/components/sites/SiteListView";
import { ProjectFilesSection } from "@/components/sites/ProjectFilesSection";
import { ProjectDetailModal } from "@/components/sites/ProjectDetailModal";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CommentDetailModal } from "@/components/CommentDetailModal";
import { ContactDetailModal } from "@/components/ContactDetailModal";
import { DeleteConfirmationDialog } from "@/components/dialogs/DeleteConfirmationDialog";
import { useMasterData } from "@/hooks/useMasterData";
import { useProjects } from "@/hooks/useData";
import { useSiteManagement } from "@/hooks/useSiteManagement";
import { useProjectManagement } from "@/hooks/useProjectManagement";
import { useSiteUnits } from "@/hooks/useSiteUnits";
import { useProjectComments } from "@/hooks/useProjectComments";
import { useProposals } from "@/hooks/useProposals";
import { useContacts } from "@/hooks/useContacts";
import { useContactAssignments } from "@/hooks/useContactAssignments";
import { useStageConsultants } from "@/hooks/useStageConsultants";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth.tsx";
import { useProfile } from "@/hooks/useProfile";
import { useStageManagement } from "@/hooks/useStageManagement";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/components/ui/use-toast";
import { MentionableUser } from "@/components/MentionAutocomplete";
import { parseMentionedUsers } from "@/utils/parseMentions";
import { createReplyMentionNotifications } from "@/utils/createMentionNotifications";
import { AddressAutocomplete, AddressComponents } from "@/components/ui/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, FolderKanban, MapPin, Plus, Edit, Search, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, FileUp, Download, Grid, List as ListIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Site, Project, ProjectFile, POFile } from "@/types/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AddSiteModal from "@/components/sites/AddSiteModal";

// Lazy load modals and components
const EditSiteModal = lazy(() => import("@/components/sites/EditSiteModal"));
const SiteDetailModal = lazy(() => import("@/components/sites/SiteDetailModal"));
const ProjectStageDetailModal = lazy(() => import("@/components/sites/ProjectStageDetailModal"));
const ProjectStageView = lazy(() => import("@/components/sites/ProjectStageView"));
const ProjectUnitsModal = lazy(() => import("@/components/sites/ProjectUnitsModal"));

// Helper function for relative timestamps (Jira/Slack style)
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return 'just now';
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) return `${daysAgo}d ago`;

  // Fall back to formatted date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

// Helper function to get user initials for avatar
const getInitials = (firstName: string, lastName: string, email?: string): string => {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'U';
};

const SitesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const masterData = useMasterData();
  const { sites: sitesData, addSite, updateSite, deleteSite } = useSiteManagement();
  const sitesLoading = false; // useSiteManagement doesn't expose loading yet
  const sitesError = null; // useSiteManagement doesn't expose error yet
  const { projects: projectsData, addProject, updateProject, deleteProject, updateProjectCode, updateProjectDescription, updateProjectStatus, loading: projectsLoading } = useProjectManagement();
  const { proposals } = useProposals();
  const { user } = useAuth();
  const { profile, fetchMyProfile } = useProfile();
  const { contacts, fetchContacts } = useContacts();
  const { getSiteContacts, updateSiteContacts, addSiteContact, removeSiteContact } = useContactAssignments();
  const { getStageConsultants, updateStageConsultants } = useStageConsultants();
  const { addNotification } = useNotifications(user?.email);

  // Load user profile and contacts on mount
  useEffect(() => {
    if (user && !profile) {
      fetchMyProfile();
    }
    // Load contacts for the component
    fetchContacts();
  }, [user, profile, fetchMyProfile, fetchContacts]);

  // Site and project selection states
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const isConsultant = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'user';
  const isSubconsultant = user?.role === 'subconsultant';

  const assignedProjectCodes = useMemo(() => {
    if (!isSubconsultant || !user?.email) return new Set<string>();
    const allowed = new Set<string>();
    projectsData.forEach((project) => {
      const hasAssignment = project.stages?.some((stage) =>
        getStageConsultants(stage.id).includes(user.email)
      );
      if (hasAssignment) {
        allowed.add(project.projectCode);
      }
    });
    return allowed;
  }, [getStageConsultants, isSubconsultant, projectsData, user?.email]);

  // Restore site/project/stage selection from the URL on initial load (covers both
  // deep links from Dashboard/Notifications and a plain browser refresh while drilled in).
  // Guarded to run once - after that, the write-back effect below keeps the URL in sync
  // with state, and we don't want this effect re-firing on every resulting URL change.
  const hasRestoredFromUrlRef = useRef(false);
  useEffect(() => {
    if (hasRestoredFromUrlRef.current) return;

    const building = searchParams.get('building');
    const projectCode = searchParams.get('projectCode');
    const project = searchParams.get('project');
    const stageId = searchParams.get('stage');

    if (!sitesData || !projectsData) return;
    if (!building && !project) return; // nothing to restore

    hasRestoredFromUrlRef.current = true;

    let site = building ? sitesData.find((s) => s.building === building) : undefined;
    let selectedProj = projectCode
      ? projectsData.find((p) => p.projectCode === projectCode && (!building || p.building === building))
      : project
      ? projectsData.find((p) => p.projectCode === project)
      : undefined;

    if (selectedProj && isSubconsultant && !assignedProjectCodes.has(selectedProj.projectCode)) {
      return;
    }

    if (!site && selectedProj) {
      site = sitesData.find((s) => s.building === selectedProj!.building);
    }

    if (site) {
      setSelectedSite(site);
    }
    if (selectedProj) {
      setSelectedProject(selectedProj);
      if (stageId) {
        const stage = selectedProj.stages?.find((s) => s.id === stageId);
        if (stage) {
          setSelectedStage(stage);
        }
      }
    }
  }, [searchParams, sitesData, projectsData, isSubconsultant, assignedProjectCodes]);

  // Handle scrolling to comment when clicked from notification
  useEffect(() => {
    // Check if there's a hash with comment ID
    const hash = window.location.hash;
    if (hash && hash.startsWith('#comment_')) {
      const commentId = hash.replace('#comment_', '');

      // Use a larger delay to ensure the project loads and comments render
      // Retry multiple times in case comments are still loading
      let attempts = 0;
      const maxAttempts = 20;

      const tryScroll = () => {
        const commentElement = document.getElementById(commentId);
        if (commentElement) {
          // Scroll to the comment
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Highlight the comment temporarily
          commentElement.style.backgroundColor = '#fef3c7';
          commentElement.style.transition = 'background-color 0.3s ease';

          // Remove highlight after 3 seconds
          setTimeout(() => {
            commentElement.style.backgroundColor = '';
          }, 3000);
        } else if (attempts < maxAttempts) {
          // Comment not found yet, try again in 200ms
          attempts++;
          setTimeout(tryScroll, 200);
        }
      };

      // Start trying to scroll after initial delay
      const timer = setTimeout(tryScroll, 300);

      return () => clearTimeout(timer);
    }
  }, [selectedProject]);

  const [selectedStage, setSelectedStage] = useState<any>(null);

  // Keep the URL in sync with the current drill-down selection, so a refresh (or a
  // shared/bookmarked link) restores the same site/project/stage view via the restore
  // effect above. Must be declared after selectedStage's useState above.
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (selectedSite) next.set('building', selectedSite.building); else next.delete('building');
      if (selectedProject) next.set('project', selectedProject.projectCode); else next.delete('project');
      // Legacy param from the old Dashboard deep-link format - superseded by 'project' above.
      next.delete('projectCode');
      if (selectedStage) next.set('stage', selectedStage.id); else next.delete('stage');
      return next;
    }, { replace: true });
  }, [selectedSite, selectedProject, selectedStage, setSearchParams]);

  const { updateStageStatus } = useStageManagement(selectedProject?.projectCode || "");
  const { units: siteUnits, addUnit: addSiteUnit, deleteUnit: deleteSiteUnit } = useSiteUnits(selectedSite?.building || "");
  const { comments, addComment, deleteComment, updateComment } = useProjectComments(selectedProject?.projectCode || "");
  const [projectDetailModalOpen, setProjectDetailModalOpen] = useState(false);
  const [siteDetailModalOpen, setSiteDetailModalOpen] = useState(false);
  const [stageDetailModalOpen, setStageDetailModalOpen] = useState(false);
  const [projectUnitsModalOpen, setProjectUnitsModalOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string>("");
  const [selectedPdfName, setSelectedPdfName] = useState<string>("");
  const [commentDetailOpen, setCommentDetailOpen] = useState(false);
  const [selectedCommentDetail, setSelectedCommentDetail] = useState<any>(null);
  const [contactDetailOpen, setContactDetailOpen] = useState(false);
  const [selectedContactDetail, setSelectedContactDetail] = useState<any>(null);
  const [filterState, setFilterState] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [isEditSiteModalOpen, setIsEditSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const normalizeProjectStages = (project: Project) => {
    if (!project.stages || project.stages.length === 0) {
      return null;
    }
    let needsUpdate = false;
    const normalizedStages = project.stages.map((stage, index) => {
      const normalizedId = stage.id || `${project.projectCode}-stage-${index + 1}`;
      const normalizedOrder = stage.order ?? index + 1;
      if (stage.id !== normalizedId || stage.order !== normalizedOrder || stage.projectCode !== project.projectCode) {
        needsUpdate = true;
      }
      return {
        ...stage,
        id: normalizedId,
        order: normalizedOrder,
        projectCode: project.projectCode,
      };
    });

    if (!needsUpdate) {
      return null;
    }

    return {
      ...project,
      stages: normalizedStages,
      updatedAt: new Date().toISOString(),
    };
  };

  // Consolidated site details editing state
  const [isEditingSiteDetails, setIsEditingSiteDetails] = useState(false);
  const [editSiteFormData, setEditSiteFormData] = useState({
    building: '',
    address: '',
    state: '',
    city: '',
    postcode: '',
    description: '',
  });

  // Contact assignment state
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [selectedSiteContacts, setSelectedSiteContacts] = useState<string[]>([]);

  // Inline unit adding states
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitType, setNewUnitType] = useState("");
  const [newUnitOEM, setNewUnitOEM] = useState("");

  // Comment input state
  const [newComment, setNewComment] = useState("");
  const [newCommentHtml, setNewCommentHtml] = useState("");
  const [editorKey, setEditorKey] = useState(0); // Force clear editor
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editCommentHtml, setEditCommentHtml] = useState("");
  const [editingEditorKey, setEditingEditorKey] = useState(0); // Force clear edit editor
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyHtml, setReplyHtml] = useState("");
  const [replyEditorKey, setReplyEditorKey] = useState(0); // Force clear reply editor
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set());

  // Delete confirmation dialog state
  const [deleteSiteDialogOpen, setDeleteSiteDialogOpen] = useState(false);
  const [isDeletingSite, setIsDeletingSite] = useState(false);

  // Sync form data when selectedSite changes
  useEffect(() => {
    if (selectedSite) {
      setEditSiteFormData({
        building: selectedSite.building || '',
        address: selectedSite.address || '',
        state: selectedSite.state || '',
        city: selectedSite.city || '',
        postcode: selectedSite.postcode || '',
        description: selectedSite.description || '',
      });
      setSelectedSiteContacts(getSiteContacts(selectedSite.building) || []);
    }
  }, [selectedSite, getSiteContacts]);

  // Ensure stage IDs are present and unique before assignments are stored
  useEffect(() => {
    if (!selectedProject) return;
    const normalized = normalizeProjectStages(selectedProject);
    if (normalized) {
      setSelectedProject(normalized);
      updateProject(selectedProject.projectCode, normalized);
    }
  }, [selectedProject, updateProject]);

  // Debounce search query to avoid excessive filtering calculations
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter contacts based on search query - memoized for performance
  const filteredContacts = useMemo(() => {
    if (!contactSearchQuery.trim()) {
      return contacts.slice(0, 20); // Show first 20 contacts if no search
    }
    const query = contactSearchQuery.toLowerCase();
    return contacts
      .filter(contact =>
        contact.firstName.toLowerCase().includes(query) ||
        contact.lastName.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query)
      )
      .slice(0, 20); // Limit to 20 results for performance
  }, [contacts, contactSearchQuery]);

  // Filter consultants to only include "LML Lift Consultants" category
  const lmlConsultants = useMemo(() => {
    return contacts.filter(contact => contact.category === 'LML Lift Consultants');
  }, [contacts]);

  // Convert consultants to MentionableUser format for mention autocomplete
  const availableUsers = useMemo(() => {
    return lmlConsultants.map(contact => ({
      email: contact.email,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      firstName: contact.firstName,
      lastName: contact.lastName,
    })) as MentionableUser[];
  }, [lmlConsultants]);

  // Filter site contacts to exclude "LML Lift Consultants" category
  const siteEligibleContacts = useMemo(() => {
    return contacts.filter(contact => contact.category !== 'LML Lift Consultants');
  }, [contacts]);

  // Filter site contacts based on search query - memoized for performance
  const filteredSiteContacts = useMemo(() => {
    if (!contactSearchQuery.trim()) {
      return siteEligibleContacts.slice(0, 20);
    }
    const query = contactSearchQuery.toLowerCase();
    return siteEligibleContacts
      .filter(contact =>
        contact.firstName.toLowerCase().includes(query) ||
        contact.lastName.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [siteEligibleContacts, contactSearchQuery]);

  // Helper function to get status badge variant and color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200';
      case 'Ready for Invoice':
        return 'bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200';
      case 'Completed':
        return 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200';
    }
  };

  // Get unique states from sites
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    sitesData.forEach(site => {
      if (site.state) states.add(site.state);
    });
    return Array.from(states).sort();
  }, [sitesData]);

  // Filter and enrich sites with projects
  const sites = useMemo(() => {
    if (!sitesData.length) return [];

    let filteredSites = sitesData;

    // Apply role-based filtering
    if (user?.role === "site_manager" && user.sites.length > 0) {
      filteredSites = filteredSites.filter(site => user.sites.includes(site.building));
    }
    if (isSubconsultant && user?.email) {
      filteredSites = filteredSites.filter(site =>
        projectsData.some(project =>
          project.building === site.building &&
          assignedProjectCodes.has(project.projectCode)
        )
      );
    }

    // Apply state filter
    if (filterState !== "all") {
      filteredSites = filteredSites.filter(site => site.state === filterState);
    }

    // Enrich sites with projects from projectsData
    const enrichedSites = filteredSites.map(site => {
      let siteProjects = projectsData.filter(project => project.building === site.building);
      if (isSubconsultant && user?.email) {
        siteProjects = siteProjects.filter(project => assignedProjectCodes.has(project.projectCode));
      }
      return {
        ...site,
        projects: siteProjects,
      };
    });

    // Apply unified search filter (searches across site name, address, city, and project codes)
    if (debouncedSearchQuery.trim()) {
      const searchTerm = debouncedSearchQuery.trim().toLowerCase();
      return enrichedSites.filter(site => {
        // Search in site fields
        const siteMatches =
          site.building.toLowerCase().includes(searchTerm) ||
          site.address?.toLowerCase().includes(searchTerm) ||
          site.city?.toLowerCase().includes(searchTerm) ||
          site.state?.toLowerCase().includes(searchTerm);

        // Search in project codes
        const projectMatches = site.projects?.some(project =>
          project.projectCode.toLowerCase().includes(searchTerm) ||
          project.description?.toLowerCase().includes(searchTerm)
        );

        return siteMatches || projectMatches;
      });
    }

    return enrichedSites;
  }, [sitesData, projectsData, filterState, debouncedSearchQuery, user, isSubconsultant, assignedProjectCodes]);

  const handleAddSite = (site: Omit<Site, 'projects' | 'assets'>) => {
    addSite(site);
    setIsAddSiteModalOpen(false);
  };

  const handleEditSite = (site: Site) => {
    setEditingSite(site);
    setIsEditSiteModalOpen(true);
  };

  const handleSaveSite = (site: Site) => {
    updateSite(site);
    setIsEditSiteModalOpen(false);
    setEditingSite(null);
    // Update selected site if it's the one being edited
    if (selectedSite?.building === site.building) {
      setSelectedSite(site);
    }
  };

  const handleSiteClick = (site) => {
    setSelectedSite(site);
    setSelectedProject(null);
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
  };

  const handleBackClick = () => {
    if (selectedStage) {
      // Stage -> Project (clear stage, keep project selected)
      setSelectedStage(null);
    } else if (selectedProject) {
      // Check if we came from My Work or another page
      const state = location.state as { from?: string } | undefined;
      if (state?.from === '/my-work') {
        // Navigate back to My Work
        navigate('/my-work');
      } else {
        // Project -> Site (clear project, keep site selected)
        setSelectedProject(null);
      }
    } else if (selectedSite) {
      // Site -> Sites List (clear site)
      setSelectedSite(null);
    }
  };

  // Get assets (units) for selected project
  // Check localStorage first for assigned units, then fall back to site units
  const units = useMemo(() => {
    if (!selectedProject) return [];

    // Check if there are assigned unit IDs in localStorage
    const storedAssignments = localStorage.getItem(`projectUnits_${selectedProject.projectCode}`);
    if (storedAssignments) {
      try {
        const assignedUnitIds = JSON.parse(storedAssignments) as string[];
        // Filter site units by the assigned IDs
        return siteUnits.filter(unit => assignedUnitIds.includes(unit.id));
      } catch (e) {
        console.error('Error parsing project units:', e);
      }
    }

    // Fall back to filtering by project code from masterData
    return masterData.filter(asset => asset.projectCode === selectedProject.projectCode);
  }, [masterData, selectedProject, siteUnits]);

  // Get project files (now from project.files instead of assets)
  // Also load from localStorage for persistence
  // Handles migration from blob URLs (invalid after reload) to data URLs (persistent)
  const projectFiles = useMemo(() => {
    if (!selectedProject) return [];

    // Try to load from localStorage first
    const storedFiles = localStorage.getItem(`projectFiles_${selectedProject.projectCode}`);
    if (storedFiles) {
      try {
        const files = JSON.parse(storedFiles);

        // Check if any files have blob URLs (invalid after page reload)
        // Blob URLs start with "blob:" and are not valid across sessions
        const hasBlobUrls = files.some((file: ProjectFile) => file.url.startsWith('blob:'));
        if (hasBlobUrls) {
          // Remove blob URL files since they are no longer accessible
          // User will need to re-upload them
          const validFiles = files.filter((file: ProjectFile) => !file.url.startsWith('blob:'));

          // Update localStorage with only valid files
          if (validFiles.length !== files.length) {
            localStorage.setItem(`projectFiles_${selectedProject.projectCode}`, JSON.stringify(validFiles));
            console.warn(`Removed ${files.length - validFiles.length} invalid blob URLs from project files`);
          }

          return validFiles;
        }

        return files;
      } catch (e) {
        console.error('Error parsing stored files:', e);
      }
    }

    // Fallback to project.files if no stored files
    return selectedProject.files || [];
  }, [selectedProject]);

  // Handle file changes and persist to localStorage
  const handleProjectFilesChange = (files: ProjectFile[]) => {
    if (!selectedProject) return;
    
    // Update localStorage
    localStorage.setItem(`projectFiles_${selectedProject.projectCode}`, JSON.stringify(files));
    
    // Update the selected project in state
    setSelectedProject({
      ...selectedProject,
      files,
    });
  };

  if (sitesLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sitesError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Sites</AlertTitle>
            <AlertDescription>
              {sitesError.message || 'Failed to load sites data. Please try refreshing the page.'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const handleConfirmDeleteSite = async () => {
    if (selectedSite) {
      setIsDeletingSite(true);
      try {
        await deleteSite(selectedSite.building);
        setSelectedSite(null);
        setDeleteSiteDialogOpen(false);
      } finally {
        setIsDeletingSite(false);
      }
    }
  };

  const handleCancelDeleteSite = () => {
    setDeleteSiteDialogOpen(false);
  };

  /**
   * Handle address autocomplete change for inline site editing
   */
  const handleSiteAddressChange = (newAddress: string, placeDetails?: AddressComponents) => {
    setEditSiteFormData((prev) => ({
      ...prev,
      address: newAddress,
    }));

    if (placeDetails) {
      // Auto-fill state from Google Places data
      const updates: any = {};
      if (placeDetails.locality) {
        updates.city = placeDetails.locality;
      }
      if (placeDetails.administrativeArea) {
        // Map abbreviations to full state names
        const stateMapping: Record<string, string> = {
          'NSW': 'New South Wales',
          'VIC': 'Victoria',
          'QLD': 'Queensland',
          'SA': 'South Australia',
          'WA': 'Western Australia',
          'TAS': 'Tasmania',
          'ACT': 'ACT',
          'NT': 'Northern Territory',
        };
        updates.state = stateMapping[placeDetails.administrativeArea] || placeDetails.administrativeArea;
      }
      if (placeDetails.postalCode) {
        updates.postcode = placeDetails.postalCode;
      }

      setEditSiteFormData((prev) => ({
        ...prev,
        ...updates,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{selectedSite ? selectedSite.building : 'Projects'}</h1>
            {!selectedSite && (
              <p className="text-muted-foreground">
                Browse projects by site, manage stages, and associated files
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isConsultant && !selectedSite && (
              <Button onClick={() => setIsAddSiteModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Site
              </Button>
            )}
            {selectedSite && (
              <>
                <Button variant="outline" onClick={handleBackClick}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                {/* Only show site edit/delete buttons when NOT viewing a project */}
                {isConsultant && !selectedProject && (
                  <>
                    <Button
                      size="sm"
                      variant={isEditingSiteDetails ? "default" : "outline"}
                      onClick={() => {
                        if (isEditingSiteDetails) {
                          // Save changes
                          const updatedSite = {
                            ...selectedSite!,
                            building: editSiteFormData.building || selectedSite!.building,
                            address: editSiteFormData.address,
                            state: editSiteFormData.state,
                            city: editSiteFormData.city,
                            postcode: editSiteFormData.postcode,
                            description: editSiteFormData.description,
                          };
                          updateSite(updatedSite);
                          setSelectedSite(updatedSite);
                          setIsEditingSiteDetails(false);
                          toast({
                            title: "Success",
                            description: "Site details updated",
                          });
                        } else {
                          setIsEditingSiteDetails(true);
                        }
                      }}
                      title="Edit site details"
                    >
                      {isEditingSiteDetails ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Save
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                    {isEditingSiteDetails && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditSiteFormData({
                            building: selectedSite?.building || '',
                            address: selectedSite?.address || '',
                            state: selectedSite?.state || '',
                            description: selectedSite?.description || '',
                          });
                          setIsEditingSiteDetails(false);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setDeleteSiteDialogOpen(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Site
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        {!selectedSite && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sites, addresses, project codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {availableStates.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('card')}
                title="Card View"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
            <Badge variant="outline" className="text-sm">
              {sites.length} site{sites.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        {/* Content */}
        {selectedSite ? (
          selectedProject ? (
            selectedStage ? (
              // Stage View
              <Suspense fallback={<div>Loading stage...</div>}>
                <ProjectStageView
                  stage={selectedStage}
                  projectCode={selectedProject.projectCode}
                  onBack={() => setSelectedStage(null)}
                  onStageUpdate={(updated) => {
                    // Update the stage in the project
                    const updatedProject: Project = {
                      ...selectedProject,
                      stages: selectedProject.stages?.map((s) =>
                        s.id === updated.id ? updated : s
                      ) || [updated],
                    };
                    setSelectedProject(updatedProject);
                    updateProject(selectedProject.projectCode, updatedProject);
                  }}
                  canUpload={isConsultant}
                  consultants={lmlConsultants}
                  stageConsultants={getStageConsultants(selectedStage.id)}
                  onAssignConsultants={(stageId, consultantEmails) => {
                    updateStageConsultants(stageId, consultantEmails);
                  }}
                />
              </Suspense>
            ) : (
            // Project Detail View
            <div className="space-y-6">
              {/* Project Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">
                        {selectedProject.projectCode}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <button
                            onClick={() => {
                              setSelectedProject(null);
                              navigate(`/sites?building=${encodeURIComponent(selectedSite.building)}`, {
                                replace: true,
                                state: location.state,
                              });
                            }}
                            className="text-foreground hover:text-primary underline-offset-4 hover:underline font-medium transition-colors"
                          >
                            {selectedSite.building}
                          </button>
                        </div>
                        {selectedProject.status && (
                          <Badge variant="outline">{selectedProject.status}</Badge>
                        )}
                      </div>
                      {selectedProject.description && (
                        <p className="mt-3 text-sm text-muted-foreground">{selectedProject.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        onClick={() => setProjectDetailModalOpen(true)}
                        className="whitespace-nowrap"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                      </Button>
                      {isConsultant && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete project "${selectedProject.projectCode}"? This cannot be undone.`)) {
                              if (deleteProject(selectedProject.projectCode)) {
                                setSelectedProject(null);
                              }
                            }
                          }}
                          className="whitespace-nowrap text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Project
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {(selectedProject.startDate || selectedProject.endDate) && (
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-6 text-sm">
                      {selectedProject.startDate && (
                        <div>
                          <span className="text-muted-foreground">Start Date: </span>
                          <span className="font-medium">{selectedProject.startDate}</span>
                        </div>
                      )}
                      {selectedProject.endDate && (
                        <div>
                          <span className="text-muted-foreground">End Date: </span>
                          <span className="font-medium">{selectedProject.endDate}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Split Layout: Assets/Stages on left, Comments on right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Assets and Stages */}
                <div className="space-y-6">
                  {/* Assets */}
                  <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Assets ({units.length})</CardTitle>
                    {isConsultant && (
                      <Button size="sm" onClick={() => setProjectUnitsModalOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Assign Assets
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {units.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset Name</TableHead>
                            <TableHead>Asset Type</TableHead>
                            <TableHead>OEM</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {units.map((unit) => (
                            <TableRow key={unit.id}>
                              <TableCell className="font-medium">{unit.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {unit.location || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {unit.description || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No assets assigned to this project</p>
                      {isConsultant && <p className="text-sm mt-2">Click "Assign Assets" to add assets to this project.</p>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Stages */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Project Stages ({selectedProject.stages?.length || 0})</CardTitle>
                    {isConsultant && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const newStage: any = {
                            id: `stage_${Date.now()}`,
                            name: `New Stage`,
                            projectCode: selectedProject.projectCode,
                            files: [],
                            order: (selectedProject.stages?.length || 0) + 1,
                            description: "",
                            status: "Not Started",
                            createdAt: new Date().toISOString(),
                          };
                          const updated: Project = {
                            ...selectedProject,
                            stages: [...(selectedProject.stages || []), newStage],
                          };
                          setSelectedProject(updated);
                          updateProject(selectedProject.projectCode, updated);
                          toast({
                            title: "Success",
                            description: "New stage added. Click to view and edit.",
                          });
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Stage
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedProject.stages && selectedProject.stages.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProject.stages.map((stage) => (
                        <div
                          key={stage.id || stage.name}
                          className="border rounded-lg p-4 hover:border-primary hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                setSelectedStage(stage);
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{stage.name || (stage as any).stage}</Badge>
                                <Badge variant="outline" className={getStatusBadgeClass(stage.status || (stage as any).status || 'Not Started')}>
                                  {stage.status || (stage as any).status || 'Not Started'}
                                </Badge>
                              </div>
                              {stage.description && (
                                <p className="text-sm text-muted-foreground mt-2">{stage.description}</p>
                              )}
                            </div>
                            {isConsultant && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStage(stage);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Are you sure you want to delete the stage "${stage.name || (stage as any).stage}"? This cannot be undone.`)) {
                                      const updatedProject: Project = {
                                        ...selectedProject,
                                        stages: selectedProject.stages?.filter((s) => s.id !== stage.id) || [],
                                      };
                                      setSelectedProject(updatedProject);
                                      updateProject(selectedProject.projectCode, updatedProject);
                                      toast({
                                        title: "Success",
                                        description: "Stage deleted",
                                      });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No stages added yet</p>
                      {isConsultant && <p className="text-sm mt-2">Click "Add Stage" to create a project stage.</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Comments/Notes */}
            <div>
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">Communication</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {/* Comment Input */}
                  <div className="space-y-2 mb-6">
                    <RichTextEditor
                      key={editorKey}
                      value={newCommentHtml}
                      onChange={(html, text) => {
                        setNewCommentHtml(html);
                        setNewComment(text);
                      }}
                      placeholder="Add a comment or update with formatting..."
                      availableUsers={availableUsers}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (newComment.trim() && user) {
                            const userName = profile
                              ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                              : '';

                            // Parse mentions from HTML
                            const mentionedUsers = newCommentHtml ? parseMentionedUsers(newCommentHtml) : [];

                            // Add comment with mention data
                            const newCommentObj = addComment(newComment, {
                              id: user.email,
                              name: userName || user.email,
                              email: user.email,
                            }, undefined, newCommentHtml);

                            // Create notifications for mentioned users
                            if (newCommentObj && mentionedUsers.length > 0 && selectedProject) {
                              const notifiedCount = createReplyMentionNotifications(
                                mentionedUsers,
                                {
                                  email: user.email,
                                  name: userName || user.email,
                                },
                                selectedProject.projectCode,
                                newCommentObj.id,
                                undefined // No parent ID for main comments
                              );
                              toast({
                                title: "Success",
                                description: `Comment posted and ${notifiedCount} user(s) notified`,
                                duration: 3000,
                              });
                            } else if (newCommentObj) {
                              toast({
                                title: "Success",
                                description: "Comment posted",
                                duration: 3000,
                              });
                            }

                            setNewComment("");
                            setNewCommentHtml("");
                            setEditorKey(prev => prev + 1); // Clear editor
                          }
                        }}
                        disabled={!newComment.trim()}
                      >
                        Post Comment
                      </Button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px]">
                    {comments.filter(c => !c.parentId).length > 0 ? (
                      comments.filter(c => !c.parentId).map((comment) => (
                        <div key={comment.id} id={comment.id} className="bg-white dark:bg-slate-950 rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                          <div className="p-4 pb-3 hover:bg-accent/5 rounded-t-lg transition-colors" onClick={() => {
                            setSelectedCommentDetail(comment);
                            setCommentDetailOpen(true);
                          }}>
                            <div className="flex items-start gap-3">
                              {/* User Avatar */}
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                                {getInitials(comment.userName.split(' ')[0] || '', comment.userName.split(' ')[1] || '', comment.userEmail)}
                              </div>

                              {/* Comment Header & Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-foreground">{comment.userName}</span>
                                  <span className="text-xs text-muted-foreground">{getRelativeTime(comment.timestamp)}</span>
                                </div>
                              </div>

                              {/* Edit/Delete Buttons */}
                              {(user?.email === comment.userId || isConsultant) && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCommentId(comment.id);
                                      setEditCommentText(comment.comment);
                                      setEditCommentHtml(comment.commentHtml || "");
                                    }}
                                    className="h-7 w-7 p-0"
                                    title="Edit comment"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm("Delete this comment?")) {
                                        deleteComment(comment.id);
                                      }
                                    }}
                                    className="h-7 w-7 p-0"
                                    title="Delete comment"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                              <RichTextEditor
                                key={editingEditorKey}
                                value={editCommentHtml}
                                onChange={(html, text) => {
                                  setEditCommentHtml(html);
                                  setEditCommentText(text);
                                }}
                                placeholder="Edit your comment..."
                                availableUsers={availableUsers}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (editCommentText.trim()) {
                                      updateComment(comment.id, editCommentText, editCommentHtml);
                                      setEditingCommentId(null);
                                      setEditCommentText("");
                                      setEditCommentHtml("");
                                      setEditingEditorKey(prev => prev + 1);
                                    }
                                  }}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditCommentText("");
                                    setEditCommentHtml("");
                                  }}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="px-4 py-3 border-t border-border/30">
                                {comment.commentHtml ? (
                                  <div
                                    className="text-sm prose prose-sm max-w-none text-foreground line-clamp-3"
                                    dangerouslySetInnerHTML={{ __html: comment.commentHtml }}
                                    onClick={() => {
                                      setSelectedCommentDetail(comment);
                                      setCommentDetailOpen(true);
                                    }}
                                  />
                                ) : (
                                  <p className="text-sm whitespace-pre-wrap line-clamp-3 text-foreground" onClick={() => {
                                    setSelectedCommentDetail(comment);
                                    setCommentDetailOpen(true);
                                  }}>
                                    {comment.comment}
                                  </p>
                                )}
                              </div>
                              <div className="px-4 py-2 border-t border-border/30 bg-accent/5 rounded-b-lg flex justify-between items-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setReplyingToCommentId(comment.id);
                                    setReplyText("");
                                    setReplyHtml("");
                                  }}
                                  className="h-7 px-2 text-xs hover:bg-accent/20"
                                >
                                  ↳ Reply
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                  {comments.filter(c => c.parentId === comment.id).length} {comments.filter(c => c.parentId === comment.id).length === 1 ? 'reply' : 'replies'}
                                </span>
                              </div>
                            </>
                          )}

                          {/* Reply Form */}
                          {replyingToCommentId === comment.id && (
                            <div className="px-4 py-3 bg-accent/5 border-t border-border/30 space-y-3">
                              <RichTextEditor
                                key={replyEditorKey}
                                value={replyHtml}
                                onChange={(html, text) => {
                                  setReplyHtml(html);
                                  setReplyText(text);
                                }}
                                placeholder="Write a reply..."
                                availableUsers={availableUsers}
                              />
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setReplyingToCommentId(null);
                                    setReplyText("");
                                    setReplyHtml("");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (replyText.trim() && user) {
                                      const userName = profile
                                        ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                                        : '';

                                      // Parse mentions from HTML
                                      const mentionedUsers = replyHtml ? parseMentionedUsers(replyHtml) : [];

                                      const newReplyObj = addComment(replyText, {
                                        id: user.email,
                                        name: userName || user.email,
                                        email: user.email,
                                      }, comment.id, replyHtml);

                                      // Create notifications for mentioned users in replies
                                      if (newReplyObj && mentionedUsers.length > 0 && selectedProject) {
                                        createReplyMentionNotifications(
                                          mentionedUsers,
                                          {
                                            email: user.email,
                                            name: userName || user.email,
                                          },
                                          selectedProject.projectCode,
                                          newReplyObj.id,
                                          comment.id // Parent comment ID for replies
                                        );
                                      }

                                      setReplyText("");
                                      setReplyHtml("");
                                      setReplyingToCommentId(null);
                                      setReplyEditorKey(prev => prev + 1);
                                    }
                                  }}
                                  disabled={!replyText.trim()}
                                >
                                  Post Reply
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Display Replies */}
                          {comments.filter(c => c.parentId === comment.id).length > 0 && (
                            <div className="px-4 py-3 border-t border-border/30 bg-background/50">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const newCollapsed = new Set(collapsedComments);
                                  if (newCollapsed.has(comment.id)) {
                                    newCollapsed.delete(comment.id);
                                  } else {
                                    newCollapsed.add(comment.id);
                                  }
                                  setCollapsedComments(newCollapsed);
                                }}
                                className="h-6 px-2 text-xs mb-2"
                              >
                                {collapsedComments.has(comment.id) ? (
                                  <>
                                    <ChevronRight className="h-3 w-3 mr-1" />
                                    {comments.filter(c => c.parentId === comment.id).length} {comments.filter(c => c.parentId === comment.id).length === 1 ? 'reply' : 'replies'}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    Hide replies
                                  </>
                                )}
                              </Button>
                              {!collapsedComments.has(comment.id) && (
                                <div className="space-y-2 mt-2">
                                  {comments
                                    .filter(c => c.parentId === comment.id)
                                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                    .map((reply) => (
                                      <div key={reply.id} id={reply.id} className="ml-6 pl-4 border-l-2 border-muted bg-accent/5 rounded p-2">
                                        <div className="flex items-start gap-2 mb-1">
                                          {/* Reply Avatar */}
                                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-semibold">
                                            {getInitials(reply.userName.split(' ')[0] || '', reply.userName.split(' ')[1] || '', reply.userEmail)}
                                          </div>

                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-semibold text-xs text-foreground">{reply.userName}</span>
                                              <span className="text-xs text-muted-foreground">{getRelativeTime(reply.timestamp)}</span>
                                            </div>
                                          </div>

                                          {(user?.email === reply.userId || isConsultant) && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => {
                                                if (window.confirm("Delete this reply?")) {
                                                  deleteComment(reply.id);
                                                }
                                              }}
                                              className="h-5 w-5 p-0"
                                              title="Delete reply"
                                            >
                                              <Trash2 className="h-3 w-3 text-red-600" />
                                            </Button>
                                          )}
                                        </div>
                                        {reply.commentHtml ? (
                                          <div
                                            className="text-xs prose prose-sm max-w-none text-foreground"
                                            dangerouslySetInnerHTML={{ __html: reply.commentHtml }}
                                          />
                                        ) : (
                                          <p className="text-xs whitespace-pre-wrap text-foreground">{reply.comment}</p>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No comments yet</p>
                        <p className="text-sm mt-2">Add the first comment to start the conversation.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Full-Width PO Files Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Purchase Order Files</CardTitle>
                {selectedProject.poFiles && selectedProject.poFiles.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedProject.poFiles.length} file{selectedProject.poFiles.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedProject.poFiles && selectedProject.poFiles.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProject.poFiles.map((poFile) => (
                      <div
                        key={poFile.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{poFile.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {poFile.fileSize} • {new Date(poFile.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4 flex-shrink-0">
                          {poFile.url && poFile.name.toLowerCase().endsWith('.pdf') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPdfUrl(poFile.url || '');
                                setSelectedPdfName(poFile.name);
                                setPdfPreviewOpen(true);
                              }}
                              title="Preview"
                            >
                              <FileUp className="h-4 w-4" />
                            </Button>
                          )}
                          {poFile.url && (
                            <a href={poFile.url} download={poFile.name}>
                              <Button size="sm" variant="ghost" title="Download">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          {isConsultant && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const updatedPoFiles = (selectedProject.poFiles || []).filter(
                                  (f) => f.id !== poFile.id
                                );
                                const updatedProject = {
                                  ...selectedProject,
                                  poFiles: updatedPoFiles,
                                };
                                updateProject(selectedProject.projectCode, updatedProject);
                                setSelectedProject(updatedProject);
                                toast({
                                  title: "Success",
                                  description: `PO file "${poFile.name}" has been deleted`,
                                });
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No PO files uploaded yet</p>
                    {isConsultant && <p className="text-sm mt-2">Click "Upload PO File" to add files.</p>}
                  </div>
                )}
                {isConsultant && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('po-file-input-dashboard')?.click()}
                    className="w-full mt-2"
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload PO File
                  </Button>
                )}
                <input
                  id="po-file-input-dashboard"
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && selectedProject) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const newPOFile: POFile = {
                          id: `po_${Date.now()}`,
                          name: file.name,
                          url: event.target?.result as string,
                          uploadedAt: new Date().toISOString(),
                          uploadedBy: 'current-user',
                          fileSize: `${(file.size / 1024).toFixed(2)} KB`,
                        };
                        const updatedPoFiles = [...(selectedProject.poFiles || []), newPOFile];
                        updateProject(selectedProject.projectCode, {
                          ...selectedProject,
                          poFiles: updatedPoFiles,
                        });
                        setSelectedProject({
                          ...selectedProject,
                          poFiles: updatedPoFiles,
                        });
                        toast({
                          title: "Success",
                          description: `PO file "${file.name}" has been uploaded`,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

            </div>
            )
          ) : (
            // Site Detail View
            <div className="space-y-6">
              {/* Site Details and Description - Split Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Site Details Card */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-4 px-6">
                    <CardTitle className="text-lg font-semibold">Site Information</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Site Name */}
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Site Name</Label>
                        {isEditingSiteDetails && isConsultant ? (
                          <Input
                            value={editSiteFormData.building}
                            onChange={(e) => setEditSiteFormData({ ...editSiteFormData, building: e.target.value })}
                            placeholder="Enter site name..."
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm font-medium text-foreground">{selectedSite?.building}</p>
                        )}
                      </div>

                      {/* State */}
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">State</Label>
                        {isEditingSiteDetails && isConsultant ? (
                          <Select value={editSiteFormData.state} onValueChange={(value) => setEditSiteFormData({ ...editSiteFormData, state: value })}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select state..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Victoria">Victoria</SelectItem>
                              <SelectItem value="New South Wales">New South Wales</SelectItem>
                              <SelectItem value="South Australia">South Australia</SelectItem>
                              <SelectItem value="Queensland">Queensland</SelectItem>
                              <SelectItem value="Northern Territory">Northern Territory</SelectItem>
                              <SelectItem value="Western Australia">Western Australia</SelectItem>
                              <SelectItem value="ACT">ACT</SelectItem>
                              <SelectItem value="New Zealand">New Zealand</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm text-foreground">{selectedSite?.state || <span className="text-muted-foreground italic">—</span>}</p>
                        )}
                      </div>

                      {/* Address - Full width */}
                      <div className="col-span-2">
                        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Address</Label>
                        {isEditingSiteDetails && isConsultant ? (
                          <div className="space-y-1">
                            <AddressAutocomplete
                              id="site-address-inline"
                              value={editSiteFormData.address}
                              onChange={handleSiteAddressChange}
                              placeholder="Start typing an address..."
                              countryRestrict="au"
                              className="h-9"
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-foreground">{selectedSite?.address || <span className="text-muted-foreground italic">No address set</span>}</p>
                        )}
                      </div>

                      {/* Total Assets */}
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Total Assets</Label>
                        <p className="text-sm font-medium text-foreground">{siteUnits.length}</p>
                      </div>

                      {/* Contacts Section */}
                      <div className="col-span-2 border-t pt-4">
                        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Assigned Contacts</Label>

                        {/* Assigned Contacts Display */}
                        <div className="space-y-2 mb-3">
                          {selectedSiteContacts.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No contacts assigned</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {selectedSiteContacts.map((contactEmail) => {
                                const contact = contacts.find(c => c.email === contactEmail);
                                return (
                                  <div
                                    key={contactEmail}
                                    className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full text-sm hover:bg-primary/20 cursor-pointer transition-colors"
                                  >
                                    <button
                                      onClick={() => {
                                        if (contact) {
                                          setSelectedContactDetail(contact);
                                          setContactDetailOpen(true);
                                        }
                                      }}
                                      className="hover:underline text-left"
                                    >
                                      {contact
                                        ? `${contact.firstName} ${contact.lastName}`
                                        : contactEmail}
                                    </button>
                                    {isConsultant && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!selectedSite) return;
                                          setSelectedSiteContacts((prev) => prev.filter(e => e !== contactEmail));
                                          removeSiteContact(selectedSite.building, contactEmail);
                                        }}
                                        className="ml-1 text-xs hover:text-red-600"
                                        title="Remove"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Contact Search/Add */}
                        {isConsultant && (
                          <div className="relative">
                            <Input
                              placeholder="Search and add contacts..."
                              value={contactSearchQuery}
                              onChange={(e) => {
                                setContactSearchQuery(e.target.value);
                                setShowContactDropdown(true);
                              }}
                              onFocus={() => setShowContactDropdown(true)}
                              className="h-9"
                            />
                            {showContactDropdown && contactSearchQuery && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                                {filteredSiteContacts.length === 0 ? (
                                  <div className="p-3 text-sm text-muted-foreground text-center">
                                    No contacts found
                                  </div>
                                ) : (
                                  filteredSiteContacts.map((contact) => (
                                    <button
                                      key={contact.id}
                                      onClick={() => {
                                        if (!selectedSite) return;
                                        if (!selectedSiteContacts.includes(contact.email)) {
                                          setSelectedSiteContacts((prev) => [...prev, contact.email]);
                                          addSiteContact(selectedSite.building, contact.email);
                                        }
                                        setContactSearchQuery("");
                                        setShowContactDropdown(false);
                                      }}
                                      disabled={selectedSiteContacts.includes(contact.email)}
                                      className="w-full text-left px-3 py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm border-b last:border-b-0"
                                    >
                                      <div className="font-medium">
                                        {contact.firstName} {contact.lastName}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {contact.email}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

              {/* Access Details Card */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4 px-6">
                  <CardTitle className="text-lg font-semibold">Access Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-6">
                  {isEditingSiteDetails && isConsultant ? (
                    <div className="space-y-4">
                      <RichTextEditor
                        value={editSiteFormData.description}
                        onChange={(html, text) => setEditSiteFormData({ ...editSiteFormData, description: html })}
                        placeholder="Enter site description..."
                      />
                    </div>
                  ) : (
                    <div className="min-h-[200px]">
                      <div
                        className="prose prose-sm max-w-none text-foreground"
                        dangerouslySetInnerHTML={{ __html: editSiteFormData.description || '<p style="color: var(--muted-foreground); font-style: italic;">No description added yet.</p>' }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

              {/* Units Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Assets ({siteUnits.length})</CardTitle>
                    {isConsultant && !isAddingUnit && (
                      <Button
                        size="sm"
                        onClick={() => setIsAddingUnit(true)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Asset
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset Name</TableHead>
                          <TableHead>Asset Type</TableHead>
                          <TableHead>OEM</TableHead>
                          {isConsultant && <TableHead className="w-20">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Add Unit Row */}
                        {isAddingUnit && (
                          <TableRow className="bg-muted/50">
                            <TableCell>
                              <Input
                                value={newUnitName}
                                onChange={(e) => setNewUnitName(e.target.value)}
                                placeholder="Asset name..."
                                className="h-8"
                                autoFocus
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={newUnitType}
                                onValueChange={setNewUnitType}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Lift">Lift</SelectItem>
                                  <SelectItem value="Escalator">Escalator</SelectItem>
                                  <SelectItem value="Moving Walks">Moving Walks</SelectItem>
                                  <SelectItem value="Hoist">Hoist</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={newUnitOEM}
                                onChange={(e) => setNewUnitOEM(e.target.value)}
                                placeholder="OEM..."
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (newUnitName.trim() && newUnitType) {
                                      // Use the hook's addUnit method
                                      addSiteUnit({
                                        name: newUnitName.trim(),
                                        location: newUnitType,
                                        description: newUnitOEM.trim(),
                                      });

                                      setNewUnitName("");
                                      setNewUnitType("");
                                      setNewUnitOEM("");
                                      setIsAddingUnit(false);
                                    } else {
                                      toast({
                                        title: "Error",
                                        description: "Please fill in asset name and type",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="px-2"
                                >
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setNewUnitName("");
                                    setNewUnitType("");
                                    setNewUnitOEM("");
                                    setIsAddingUnit(false);
                                  }}
                                  className="px-2"
                                >
                                  <X className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}

                        {/* Existing Units */}
                        {siteUnits.length > 0 ? (
                          siteUnits.map((unit) => (
                            <TableRow key={unit.id}>
                              <TableCell className="font-medium">{unit.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {unit.location || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {unit.description || "-"}
                              </TableCell>
                              {isConsultant && (
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (window.confirm(`Delete asset "${unit.name}"?`)) {
                                        deleteSiteUnit(unit.id);
                                      }
                                    }}
                                    className="px-2"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          !isAddingUnit && (
                            <TableRow>
                              <TableCell colSpan={isConsultant ? 4 : 3} className="text-center py-8 text-muted-foreground">
                                <p>No assets added yet</p>
                                {isConsultant && <p className="text-sm mt-2">Click "Add Asset" to add assets to this site.</p>}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Projects Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    Projects ({selectedSite.projects?.length || 0})
                  </h2>
                  {isConsultant && (
                    <Button
                      onClick={() => {
                        const newProjectCode = `PRJ-${Date.now()}`;
                        const newProject: Project = {
                          projectCode: newProjectCode,
                          building: selectedSite.building,
                          description: 'New Project',
                          status: 'Active',
                          stages: [],
                          files: [],
                          assets: [],
                        };
                        // Add project to the data store
                        if (addProject(newProject)) {
                          // Set as selected to show it immediately
                          setSelectedProject(newProject);
                          // Open edit modal so user can set details
                          setTimeout(() => {
                            setProjectDetailModalOpen(true);
                          }, 100);
                        }
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Project
                    </Button>
                  )}
                </div>
                {selectedSite.projects && selectedSite.projects.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {selectedSite.projects.map((project) => {
                      // Load assigned units from localStorage
                      const storedAssignments = localStorage.getItem(`projectUnits_${project.projectCode}`);
                      let assignedUnits: any[] = [];
                      if (storedAssignments) {
                        try {
                          const assignedUnitIds = JSON.parse(storedAssignments) as string[];
                          assignedUnits = siteUnits.filter(unit => assignedUnitIds.includes(unit.id));
                        } catch (e) {
                          console.error('Error loading project units:', e);
                        }
                      }

                      // Create project with units loaded
                      const projectWithUnits = {
                        ...project,
                        units: assignedUnits,
                      };

                      return (
                        <ProjectCard
                          key={project.projectCode}
                          project={projectWithUnits}
                          onClick={() => {
                            setSelectedProject(projectWithUnits);
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No projects found for this site</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )
        ) : (
          // Sites View (Card or List)
          <div>
            {sites.length > 0 ? (
              viewMode === 'card' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sites.map((site) => (
                    <SiteCard
                      key={site.building}
                      site={site}
                      onClick={() => handleSiteClick(site)}
                    />
                  ))}
                </div>
              ) : (
                <SiteListView
                  sites={sites}
                  onSelectSite={handleSiteClick}
                  onEditSite={handleEditSite}
                  onDeleteSite={deleteSite}
                  isConsultant={isConsultant}
                  contacts={contacts}
                  siteContacts={Object.fromEntries(
                    sites.map(site => [site.building, getSiteContacts(site.building)])
                  )}
                />
              )
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No sites found</h3>
                  <p className="text-muted-foreground">
                    {filterState !== "all" 
                      ? `No sites found in ${filterState}. Try selecting a different state.`
                      : 'No sites available.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProjectDetailModal
        project={selectedProject}
        isOpen={projectDetailModalOpen}
        onClose={() => setProjectDetailModalOpen(false)}
        onEditCode={async (newCode) => {
          if (selectedProject) {
            const result = await updateProjectCode(selectedProject.projectCode, newCode);
            if (result.ok) {
              setSelectedProject({ ...selectedProject, projectCode: newCode });
            }
            return result;
          }
          return { ok: false };
        }}
        onEditDescription={(newDesc) => {
          if (selectedProject) {
            updateProjectDescription(selectedProject.projectCode, newDesc);
            setSelectedProject({ ...selectedProject, description: newDesc });
          }
        }}
        onEditStatus={(newStatus) => {
          if (selectedProject) {
            updateProjectStatus(selectedProject.projectCode, newStatus);
            setSelectedProject({ ...selectedProject, status: newStatus });
          }
        }}
        onEditReportTemplatesFolderUrl={(newUrl) => {
          if (selectedProject) {
            updateProject(selectedProject.projectCode, {
              ...selectedProject,
              reportTemplatesFolderUrl: newUrl,
            });
            setSelectedProject({
              ...selectedProject,
              reportTemplatesFolderUrl: newUrl,
            });
          }
        }}
        onAddPOFile={(poFile) => {
          if (selectedProject) {
            const updatedPoFiles = [...(selectedProject.poFiles || []), poFile];
            updateProject(selectedProject.projectCode, {
              ...selectedProject,
              poFiles: updatedPoFiles,
            });
            setSelectedProject({
              ...selectedProject,
              poFiles: updatedPoFiles,
            });
            toast({
              title: "Success",
              description: `PO file "${poFile.name}" has been uploaded`,
            });
          }
        }}
        onDeletePOFile={(fileId) => {
          if (selectedProject) {
            const updatedPoFiles = (selectedProject.poFiles || []).filter(
              (f) => f.id !== fileId
            );
            updateProject(selectedProject.projectCode, {
              ...selectedProject,
              poFiles: updatedPoFiles,
            });
            setSelectedProject({
              ...selectedProject,
              poFiles: updatedPoFiles,
            });
            toast({
              title: "Success",
              description: "PO file has been deleted",
            });
          }
        }}
        proposalNumber={
          selectedProject?.proposalId
            ? proposals.find((p) => p.id === selectedProject.proposalId)
                ?.proposalNumber
            : undefined
        }
        onProposalClick={() => {
          setProjectDetailModalOpen(false);
          navigate('/proposals');
        }}
      />

      <PDFPreviewModal
        isOpen={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        pdfUrl={selectedPdfUrl}
        fileName={selectedPdfName}
      />

      <CommentDetailModal
        isOpen={commentDetailOpen}
        onClose={() => setCommentDetailOpen(false)}
        comment={selectedCommentDetail}
        onDelete={(commentId) => {
          deleteComment(commentId);
          setCommentDetailOpen(false);
        }}
        canEdit={user?.email === selectedCommentDetail?.userId || isConsultant}
        allComments={comments}
      />

      <ContactDetailModal
        isOpen={contactDetailOpen}
        onClose={() => {
          setContactDetailOpen(false);
          setSelectedContactDetail(null);
        }}
        contact={selectedContactDetail}
      />

      <Suspense fallback={null}>
        <SiteDetailModal
          site={selectedSite}
          isOpen={siteDetailModalOpen}
          onClose={() => setSiteDetailModalOpen(false)}
          onEditDescription={(newDescription) => {
            if (selectedSite) {
              const updatedSite = {
                ...selectedSite,
                description: newDescription,
              };
              updateSite(updatedSite);
              setSelectedSite(updatedSite);
            }
          }}
          onUnitsChange={(newUnits) => {
            if (selectedSite) {
              const updatedSite = {
                ...selectedSite,
                units: newUnits,
              };
              updateSite(updatedSite);
              setSelectedSite(updatedSite);
            }
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        {selectedProject && selectedSite && (
          <ProjectUnitsModal
            projectCode={selectedProject.projectCode}
            siteName={selectedSite.building}
            isOpen={projectUnitsModalOpen}
            onClose={() => setProjectUnitsModalOpen(false)}
            availableUnits={siteUnits}
            assignedUnitIds={units.map(u => u.id)}
            onUnitsChange={(unitIds) => {
              // Store assigned unit IDs in localStorage for persistence
              localStorage.setItem(`projectUnits_${selectedProject.projectCode}`, JSON.stringify(unitIds));

              // Update selectedProject to reflect the new units
              const updatedUnits = siteUnits.filter(unit => unitIds.includes(unit.id));
              const updatedProject = {
                ...selectedProject,
                units: updatedUnits,
              } as any;
              setSelectedProject(updatedProject);

              // Close modal and show success toast
              setProjectUnitsModalOpen(false);
              toast({
                title: "Success",
                description: `Updated ${unitIds.length} unit(s) for project`,
              });
            }}
            canEdit={isConsultant}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <ProjectStageDetailModal
          stage={selectedStage}
          isOpen={stageDetailModalOpen}
          onClose={() => setStageDetailModalOpen(false)}
          onStatusChange={(newStatus) => {
            if (selectedStage && selectedStage.id) {
              updateStageStatus(selectedStage.id, newStatus);
              // Update the selected stage to reflect the change
              setSelectedStage({
                ...selectedStage,
                status: newStatus,
              });
            }
          }}
          canUpload={isConsultant}
        />
      </Suspense>

      <AddSiteModal
        open={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        onSave={handleAddSite}
      />
      <Suspense fallback={null}>
        <EditSiteModal
          open={isEditSiteModalOpen}
          site={editingSite}
          onClose={() => {
            setIsEditSiteModalOpen(false);
            setEditingSite(null);
          }}
          onSave={handleSaveSite}
        />
      </Suspense>

      {/* Delete Site Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteSiteDialogOpen}
        title="Delete Site"
        description="This will permanently delete the site and all its projects and stages. This action cannot be undone."
        itemName={selectedSite?.building}
        isLoading={isDeletingSite}
        onConfirm={handleConfirmDeleteSite}
        onCancel={handleCancelDeleteSite}
      />
    </div>
  );
};

export default SitesPage;
