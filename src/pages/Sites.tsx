import { useState, useMemo, useEffect, Suspense, lazy } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import SiteCard from "@/components/site-files/SiteCard";
import ProjectCard from "@/components/site-files/ProjectCard";
import { ProjectFilesSection } from "@/components/sites/ProjectFilesSection";
import { useMasterData } from "@/hooks/useMasterData";
import { useProjects } from "@/hooks/useData";
import { useSiteManagement } from "@/hooks/useSiteManagement";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth.tsx";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, FolderKanban, MapPin, Plus, Edit, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Site, Project, ProjectFile } from "@/types/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AddSiteModal from "@/components/sites/AddSiteModal";

// Lazy load EditSiteModal - only loaded when user clicks Edit button
const EditSiteModal = lazy(() => import("@/components/sites/EditSiteModal"));

const SitesPage = () => {
  const masterData = useMasterData();
  const { sites: sitesData, addSite, updateSite } = useSiteManagement();
  const sitesLoading = false; // useSiteManagement doesn't expose loading yet
  const sitesError = null; // useSiteManagement doesn't expose error yet
  const { data: projectsData, loading: projectsLoading } = useProjects();
  const { user } = useAuth();
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filterState, setFilterState] = useState("all");
  const [projectCodeSearch, setProjectCodeSearch] = useState("");
  const [debouncedProjectCodeSearch, setDebouncedProjectCodeSearch] = useState("");
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [isEditSiteModalOpen, setIsEditSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  // Debounce project code search to avoid excessive filtering calculations
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProjectCodeSearch(projectCodeSearch), 300);
    return () => clearTimeout(timer);
  }, [projectCodeSearch]);

  const isConsultant = user?.role === 'consultant';

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

    // Apply state filter
    if (filterState !== "all") {
      filteredSites = filteredSites.filter(site => site.state === filterState);
    }

    // Enrich sites with projects from projectsData
    const enrichedSites = filteredSites.map(site => {
      const siteProjects = projectsData.filter(project => project.building === site.building);
      return {
        ...site,
        projects: siteProjects,
      };
    });

    // Apply project code search filter using debounced value
    if (debouncedProjectCodeSearch.trim()) {
      const searchTerm = debouncedProjectCodeSearch.trim().toLowerCase();
      return enrichedSites.filter(site => {
        // Check if any project code matches the search term
        return site.projects?.some(project =>
          project.projectCode.toLowerCase().includes(searchTerm)
        );
      });
    }

    return enrichedSites;
  }, [sitesData, projectsData, filterState, debouncedProjectCodeSearch, user]);

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
    if (selectedProject) {
      setSelectedProject(null);
    } else {
      setSelectedSite(null);
    }
  };

  // Get assets (units) for selected project
  const units = useMemo(() => {
    if (!selectedProject) return [];
    return masterData.filter(asset => asset.projectCode === selectedProject.projectCode);
  }, [masterData, selectedProject]);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sites</h1>
            <p className="text-muted-foreground">Browse sites, projects, and associated files</p>
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
                {isConsultant && (
                  <Button variant="outline" onClick={() => handleEditSite(selectedSite)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Site
                  </Button>
                )}
                <Button variant="outline" onClick={handleBackClick}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {selectedProject ? 'Back to Projects' : 'Back to Sites'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        {!selectedSite && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by project code..."
                value={projectCodeSearch}
                onChange={(e) => setProjectCodeSearch(e.target.value)}
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
            <Badge variant="outline" className="text-sm">
              {sites.length} site{sites.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        {/* Content */}
        {selectedSite ? (
          selectedProject ? (
            // Project Detail View
            <div className="space-y-6">
              {/* Project Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">
                        {selectedProject.description || `Project ${selectedProject.projectCode}`}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4" />
                          <span>Code: <strong className="text-foreground">{selectedProject.projectCode}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{selectedSite.building}</span>
                        </div>
                        {selectedProject.status && (
                          <Badge variant="outline">{selectedProject.status}</Badge>
                        )}
                      </div>
                      {selectedProject.description && (
                        <p className="mt-3 text-sm text-foreground">{selectedProject.description}</p>
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

              {/* Units/Assets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Units ({units.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {units.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Unit ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Contractor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {units.map((unit) => (
                            <TableRow key={unit.id}>
                              <TableCell className="font-medium">{unit.id}</TableCell>
                              <TableCell>{unit.type}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{unit.status}</Badge>
                              </TableCell>
                              <TableCell>{unit.contractor}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No units assigned to this project</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Stages */}
              {selectedProject.stages && selectedProject.stages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Project Stages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedProject.stages.map((stage, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{stage.stage}</Badge>
                          </div>
                          {stage.description && (
                            <p className="text-sm text-muted-foreground mt-2">{stage.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Project Files */}
              <ProjectFilesSection 
                files={projectFiles} 
                projectCode={selectedProject.projectCode}
                onFilesChange={handleProjectFilesChange}
                canUpload={isConsultant}
              />
            </div>
          ) : (
            // Site Projects View
            <div className="space-y-6">
              {/* Site Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{selectedSite.building}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {selectedSite.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{selectedSite.address}</span>
                          </div>
                        )}
                        {selectedSite.state && (
                          <Badge variant="outline">{selectedSite.state}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Projects Grid */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  Projects ({selectedSite.projects?.length || 0})
                </h2>
                {selectedSite.projects && selectedSite.projects.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {selectedSite.projects.map((project) => (
                      <ProjectCard 
                        key={project.projectCode} 
                        project={project} 
                        onClick={() => handleProjectClick(project)} 
                      />
                    ))}
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
          // Sites Grid View
          <div>
            {sites.length > 0 ? (
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
    </div>
  );
};

export default SitesPage;
