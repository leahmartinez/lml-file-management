import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, MapPin, Calendar, Wrench, Filter, Search, Eye } from "lucide-react";
import { AssetDetailDialog } from "@/components/assets/AssetDetailDialog";
import { Asset } from "@/components/assets/AssetTable";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

import { useMasterData } from "@/hooks/useMasterData";
import { useAuth } from "@/hooks/useAuth.tsx";

interface PortfolioAsset {
  id: string;
  name: string;
  type: "Elevator" | "Escalator" | "Moving Walkway";
  building: string;
  floor: string;
  contractor: "TKE" | "KONE" | "Schindler" | "Otis";
  status: "Operational" | "Maintenance" | "Offline";
  lastService: string;
  nextMaintenance: string;
  installYear: number;
  warrantyStatus: "Active" | "Expired";
}

const Portfolio = () => {
  const masterData = useMasterData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [filterContractor, setFilterContractor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [dialogMode, setDialogMode] = useState<'details' | 'service-history'>('details');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Pagination state
  const ITEMS_PER_PAGE = 9; // 3 columns x 3 rows
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input to avoid excessive filtering calculations
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterBuilding, filterContractor, filterStatus]);

  // Memoize filter dropdown options to avoid recalculating on every render
  const buildingOptions = useMemo(() =>
    [...new Set(masterData.map(asset => asset.building))],
    [masterData]
  );

  const contractorOptions = useMemo(() =>
    [...new Set(masterData.map(asset => asset.contractor))],
    [masterData]
  );

  const statusOptions = useMemo(() =>
    [...new Set(masterData.map(asset => asset.status))],
    [masterData]
  );

  const filteredAssets = useMemo(() => {
    let assets = masterData;

    // Admin, national managers, and consultants see all data
    if (user?.role === "site_manager" && user.sites.length > 0) {
      assets = assets.filter(asset => user.sites.includes(asset.building));
    }
    // Other roles (admin, national_manager, consultant) see all assets

    return assets.filter(asset => {
      const matchesSearch = (asset.nickname && asset.nickname.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
                         (asset.building && asset.building.toLowerCase().includes(debouncedSearch.toLowerCase()));
      const matchesBuilding = filterBuilding === "all" || asset.building === filterBuilding;
      const matchesContractor = filterContractor === "all" || asset.contractor === filterContractor;
      const matchesStatus = filterStatus === "all" || asset.status === filterStatus;

      return matchesSearch && matchesBuilding && matchesContractor && matchesStatus;
    });
  }, [masterData, debouncedSearch, filterBuilding, filterContractor, filterStatus, user]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

  // Generate page numbers for pagination UI
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    // Adjust startPage if we're near the end
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const getStatusColor = (status: PortfolioAsset["status"]) => {
    switch (status) {
      case "Operational":
        return "status-active";
      case "Maintenance":
        return "bg-warning/10 text-warning border-warning/20";
      case "Offline":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getWarrantyColor = (status: PortfolioAsset["warrantyStatus"]) => {
    return status === "Active" 
      ? "status-active"
      : "bg-destructive/10 text-destructive border-destructive/20";
  };

  const handleViewDetails = (asset: PortfolioAsset) => {
    // Convert PortfolioAsset to Asset format
    const assetForDetail: Asset = {
      id: asset.id,
      name: asset.name,
      nickname: asset.name,
      type: asset.type,
      status: asset.status,
      building: asset.building,
      floor: asset.floor,
      contractor: asset.contractor,
      lastService: asset.lastService,
      nextMaintenance: asset.nextMaintenance,
      installYear: asset.installYear,
      warrantyStatus: asset.warrantyStatus,
    };
    setSelectedAsset(assetForDetail);
    setDialogMode('details');
    setDialogOpen(true);
  };

  const handleViewServiceHistory = (asset: PortfolioAsset) => {
    // Convert PortfolioAsset to Asset format
    const assetForDetail: Asset = {
      id: asset.id,
      name: asset.name,
      nickname: asset.name,
      type: asset.type,
      status: asset.status,
      building: asset.building,
      floor: asset.floor,
      contractor: asset.contractor,
      lastService: asset.lastService,
      nextMaintenance: asset.nextMaintenance,
      installYear: asset.installYear,
      warrantyStatus: asset.warrantyStatus,
    };
    setSelectedAsset(assetForDetail);
    setDialogMode('service-history');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAsset(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Asset Portfolio</h1>
            <p className="text-muted-foreground">Comprehensive view of all vertical transport assets</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {filteredAssets.length} of {masterData.length} assets
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                <SelectTrigger>
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildingOptions.map(building => (
                    <SelectItem key={building} value={building}>{building}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterContractor} onValueChange={setFilterContractor}>
                <SelectTrigger>
                  <SelectValue placeholder="All Contractors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contractors</SelectItem>
                  {contractorOptions.map(contractor => (
                    <SelectItem key={contractor} value={contractor}>{contractor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setFilterBuilding("all");
                  setFilterContractor("all");
                  setFilterStatus("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Info */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredAssets.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredAssets.length)} of {filteredAssets.length} results
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedAssets.map((asset) => (
            <Card key={asset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{asset.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{asset.type} • ID: {asset.id}</p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(asset.status)}>
                    {asset.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location */}
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{asset.building}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{asset.floor}</span>
                </div>

                {/* Contractor & Warranty */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{asset.contractor}</Badge>
                  <Badge variant="outline" className={getWarrantyColor(asset.warrantyStatus)}>
                    Warranty: {asset.warrantyStatus}
                  </Badge>
                </div>

                {/* Service Dates */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Service:</span>
                    <span>{asset.lastService}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Next Maintenance:</span>
                    <span>{asset.nextMaintenance}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Install Year:</span>
                    <span>{asset.installYear}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewDetails(asset)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewServiceHistory(asset)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Service History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && paginatedAssets.length > 0 && (
          <div className="flex justify-center mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {getPageNumbers()[0] > 1 && (
                  <>
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {getPageNumbers()[0] > 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}

                {getPageNumbers().map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={page === currentPage}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                  <>
                    {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {filteredAssets.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No assets found</h3>
              <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Asset Detail Dialog */}
      <AssetDetailDialog
        asset={selectedAsset}
        open={dialogOpen}
        onClose={handleCloseDialog}
        mode={dialogMode}
      />
    </div>
  );
};

export default Portfolio;