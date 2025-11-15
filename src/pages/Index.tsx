import { useState, useMemo, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { SiteFilter } from "@/components/dashboard/SiteFilter";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ServiceTicketsChart } from "@/components/dashboard/ServiceTicketsChart";
import { ContractorDistributionChart } from "@/components/dashboard/ContractorDistributionChart";
import { UptimeChart } from "@/components/dashboard/UptimeChart";
import { AssetStatusChartComponent as AssetStatusChart } from "@/components/dashboard/AssetStatusChart";
import { ResponseTimeChart } from "@/components/dashboard/ResponseTimeChart";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { Building, Wrench, Calendar, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useAssets } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth.tsx";
import { useProfile } from "@/hooks/useProfile";

// Chart skeleton placeholder for loading state
const ChartSkeleton = () => <Skeleton className="h-96 rounded-lg" />;

// Custom hook for lazy loading components with intersection observer
const useLazyLoad = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Unobserve once visible to prevent re-triggering
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold: 0.1 } // Trigger when 10% of element is visible
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isVisible };
};

const Index = () => {
  const { data: masterData, loading, error } = useAssets();
  const { user } = useAuth();
  const { profile, fetchMyProfile } = useProfile();
  const [selectedSite, setSelectedSite] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [dismissedProfileBanner, setDismissedProfileBanner] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [assetStatusTab, setAssetStatusTab] = useState<"offline" | "maintenance">("offline");

  // Load user profile on mount
  useEffect(() => {
    fetchMyProfile().catch(() => {
      // Silently fail - profile is optional for dashboard display
    });
  }, [fetchMyProfile]);

  // Lazy load refs for each chart to defer rendering until visible
  const serviceTicketsRef = useLazyLoad();
  const contractorRef = useLazyLoad();
  const uptimeRef = useLazyLoad();
  const statusRef = useLazyLoad();
  const responseTimeRef = useLazyLoad();

  const filteredMasterData = useMemo(() => {
    // Apply site filter if selected
    let filtered = masterData;
    if (selectedSite !== "all") {
      filtered = filtered.filter(asset => asset.building === selectedSite);
    }

    // Apply role-based filtering
    if (!user) {
      return [];
    }
    
    // Admin, national managers, and consultants see all data
    if (user.role === "admin" || user.role === "national_manager" || user.role === "consultant") {
      return filtered;
    }
    
    // Site managers only see their assigned sites
    if (user.role === "site_manager" && user.sites.length > 0) {
      return filtered.filter(asset => user.sites.includes(asset.building));
    }
    
    return [];
  }, [masterData, user, selectedSite]);

  const handleAssetSelect = (asset: Asset) => {
    // Toggle: if clicking the same asset, close it; otherwise select it
    if (selectedAsset?.id === asset.id) {
      setSelectedAsset(null);
    } else {
      setSelectedAsset(asset);
    }
  };

  const totalAssets = filteredMasterData.length;
  const activeServiceTickets = filteredMasterData.filter(asset => asset.status === 'Maintenance').length;
  const upcomingMaintenance = filteredMasterData.filter(asset => {
    if (!asset.nextMaintenance) return false;
    const nextMaintenanceDate = new Date(asset.nextMaintenance);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return nextMaintenanceDate >= today && nextMaintenanceDate <= thirtyDaysFromNow;
  }).length;

  const systemUptime = filteredMasterData.length > 0 ? (filteredMasterData.reduce((acc, asset) => acc + parseFloat(String(asset.uptime || 0)), 0) / filteredMasterData.length).toFixed(1) + '%' : 'N/A';

  // Filter assets by status for the tabs
  const offlineAssets = useMemo(() => {
    return filteredMasterData.filter(asset => asset.status === 'Offline');
  }, [filteredMasterData]);

  const maintenanceAssets = useMemo(() => {
    return filteredMasterData.filter(asset => asset.status === 'Maintenance');
  }, [filteredMasterData]);

  const tabAssets = assetStatusTab === 'offline' ? offlineAssets : maintenanceAssets;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>
              {error.message || 'Failed to load dashboard data. Please try refreshing the page.'}
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

      <div className="p-6 space-y-6">
        {/* Profile Completion Banner */}
        {profile && !dismissedProfileBanner && (
          <ProfileCompletionBanner
            profile={profile}
            onEditClick={() => setShowEditProfileModal(true)}
            onDismiss={() => setDismissedProfileBanner(true)}
            showDismiss={true}
          />
        )}

        {/* Top Row - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Total Assets Managed"
            value={totalAssets}
            icon={Building}
          />
          <DashboardCard
            title="Active Service Tickets"
            value={activeServiceTickets}
            icon={Wrench}
          />
          <DashboardCard
            title="Upcoming Maintenance"
            value={upcomingMaintenance}
            icon={Calendar}
          />
          <DashboardCard
            title="System Uptime"
            value={systemUptime}
            icon={TrendingUp}
          />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Charts & Analytics */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            {/* Site Filter */}
            <SiteFilter selectedSite={selectedSite} onSiteChange={setSelectedSite} />
            
            {/* Charts Grid - Lazy loaded with Intersection Observer */}
            <div className="grid grid-cols-1 gap-6">
              <div ref={serviceTicketsRef.ref}>
                {serviceTicketsRef.isVisible ? (
                  <ServiceTicketsChart data={filteredMasterData} />
                ) : (
                  <ChartSkeleton />
                )}
              </div>
              <div ref={contractorRef.ref}>
                {contractorRef.isVisible ? (
                  <ContractorDistributionChart data={filteredMasterData} />
                ) : (
                  <ChartSkeleton />
                )}
              </div>
              <div ref={uptimeRef.ref}>
                {uptimeRef.isVisible ? (
                  <UptimeChart data={filteredMasterData} />
                ) : (
                  <ChartSkeleton />
                )}
              </div>
              <div ref={statusRef.ref}>
                {statusRef.isVisible ? (
                  <AssetStatusChart data={filteredMasterData} />
                ) : (
                  <ChartSkeleton />
                )}
              </div>
              <div ref={responseTimeRef.ref}>
                {responseTimeRef.isVisible ? (
                  <ResponseTimeChart data={filteredMasterData} />
                ) : (
                  <ChartSkeleton />
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Asset Management */}
          <div className="col-span-12 lg:col-span-7">
            <div className="space-y-4">
              {/* Asset Status Tabs */}
              <div className="flex gap-2 border-b border-border">
                <Button
                  variant={assetStatusTab === "offline" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setAssetStatusTab("offline")}
                  className="rounded-b-none"
                >
                  Offline Units ({offlineAssets.length})
                </Button>
                <Button
                  variant={assetStatusTab === "maintenance" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setAssetStatusTab("maintenance")}
                  className="rounded-b-none"
                >
                  Maintenance Units ({maintenanceAssets.length})
                </Button>
              </div>

              {/* Asset Table and Detail */}
              {selectedAsset ? (
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 xl:col-span-6">
                    <AssetTable
                      onAssetSelect={handleAssetSelect}
                      selectedAssetId={selectedAsset.id}
                      data={tabAssets}
                    />
                  </div>
                  <div className="col-span-12 xl:col-span-6">
                    <AssetDetailPanel
                      asset={selectedAsset}
                      onClose={() => setSelectedAsset(null)}
                    />
                  </div>
                </div>
              ) : (
                <AssetTable onAssetSelect={handleAssetSelect} data={tabAssets} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          profile={profile}
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onSave={async (updates) => {
            await fetchMyProfile();
            // Clear banner dismissal so it shows updated completion status
            setDismissedProfileBanner(false);
            // Dispatch profile update event to notify other components (contact directory, etc)
            const email = profile.email;
            const event = new CustomEvent('profileUpdated', { detail: { email } });
            window.dispatchEvent(event);
            setShowEditProfileModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Index;
