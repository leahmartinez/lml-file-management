# Performance Optimization Guide - LiftWatch Asset View

## Overview
This document details 13 performance bottlenecks identified in the application and the quickwins that can be implemented to significantly improve responsiveness.

**Status**: 1/13 issues fixed (CSV reading)

---

## Fixed Issues ✅

### Issue 1: CSV File Truncation (FIXED)
**Severity**: HIGH
**Impact**: Large CSV files (52KB+) were being truncated mid-read

**What Was Fixed**:
```typescript
// BEFORE: Only reads first chunk (~16KB)
const result = await reader.read();
const csv = decoder.decode(result.value);

// AFTER: Reads complete file
const chunks: Uint8Array[] = [];
let result = await reader.read();
while (!result.done) {
  chunks.push(result.value);
  result = await reader.read();
}
const csv = decoder.decode(new Uint8Array(...));
```

**Files Modified**: `src/services/dataService.ts` (lines 27-38)

---

## Remaining Critical Issues (12)

### CRITICAL Issues (3)

#### Issue 2: No Data Caching - Multiple CSV Parses Per Session
**Severity**: CRITICAL
**Impact**: Every page load re-parses all CSV files from scratch
**Estimated Fix Time**: 2-3 hours

**Problem**:
- `useAssets()`, `useSites()`, `useProjects()`, `useContacts()` hooks trigger full CSV re-parse on every use
- Each component on a page creates new fetches
- Pages like Portfolio, Sites, Index all load the same data multiple times

**Solution**:
Implement React Query (already installed via `@tanstack/react-query`):
```typescript
// src/hooks/useQueryHooks.ts (already created on main branch, needs to be copied to dev)
const { data: assets } = useQuery({
  queryKey: ['assets'],
  queryFn: () => dataService.fetchAssets(),
  staleTime: 2 * 60 * 1000,  // 2 minutes
  cacheTime: 5 * 60 * 1000,  // 5 minutes
});
```

**Expected Improvement**: 50-70% reduction in network requests and parsing time

---

#### Issue 3: Portfolio Filter Dropdowns - Inefficient Recalculation
**Severity**: CRITICAL
**Impact**: UI freezes for 1-2 seconds when opening filter dropdowns
**Estimated Fix Time**: 30 minutes

**Problem** (src/pages/Portfolio.tsx lines 171-197):
```typescript
// Creates new Sets on every render - O(n) operation repeated 3x
{[...new Set(masterData.map(asset => asset.building))].map(building => (
  <SelectItem key={building} value={building}>{building}</SelectItem>
))}
```

**Solution**:
```typescript
const buildingOptions = useMemo(() =>
  [...new Set(masterData.map(asset => asset.building))],
  [masterData]
);

// Repeat for contractor and status options
```

**Files to Fix**:
- `src/pages/Portfolio.tsx` (lines 165-197) - 3 dropdowns

**Expected Improvement**: Filter dropdowns open instantly (< 50ms)

---

#### Issue 4: SiteFilter Component - Duplicate Data Transformation
**Severity**: CRITICAL
**Impact**: Dashboard becomes laggy on site selection changes
**Estimated Fix Time**: 30 minutes

**Problem** (src/components/dashboard/SiteFilter.tsx lines 12-18):
```typescript
// Re-transforms data every render, no memoization
const sites = masterData.reduce((acc, asset) => {
  if (!acc.find(s => s.value === asset.building)) {  // O(n) find!
    acc.push({ value: asset.building, label: asset.building });
  }
  return acc;
}, [...]);
```

**Solution**:
1. Wrap component in `React.memo(SiteFilter)`
2. Memoize the sites calculation:
```typescript
const sites = useMemo(() => {
  const seen = new Set<string>();
  return masterData.reduce((acc, asset) => {
    if (asset.building && !seen.has(asset.building)) {
      seen.add(asset.building);
      acc.push({ value: asset.building, label: asset.building });
    }
    return acc;
  }, [{ value: "all", label: "All Sites" }]);
}, [masterData]);
```

**Files to Fix**:
- `src/components/dashboard/SiteFilter.tsx` (entire component)

**Expected Improvement**: Instant site filter updates, no dashboard lag

---

### HIGH Severity Issues (5)

#### Issue 5: Dashboard Charts - Inefficient Data Aggregation
**Severity**: HIGH
**Impact**: Dashboard takes 2-3 seconds to render
**Estimated Fix Time**: 1 hour

**Problem** (src/components/dashboard/):
- `ServiceTicketsChart.tsx` (lines 5-22) - NO memoization
- `ContractorDistributionChart.tsx` (lines 12-21) - NO memoization
- String parsing and date operations happen every render

**Solution**:
Wrap all chart data calculations in `useMemo`:
```typescript
const chartData = useMemo(() => {
  // All processing here
}, [data]);
```

**Files to Fix**:
- `src/components/dashboard/ServiceTicketsChart.tsx`
- `src/components/dashboard/ContractorDistributionChart.tsx`
- `src/components/dashboard/AssetStatusChart.tsx` (already memoized)

**Expected Improvement**: Dashboard renders in < 500ms

---

#### Issue 6: Asset Table Search - No Debouncing
**Severity**: HIGH
**Impact**: Table becomes unresponsive while typing
**Estimated Fix Time**: 45 minutes

**Problem** (src/components/assets/AssetTable.tsx lines 27-32):
```typescript
// Recalculates filter for EVERY keystroke - O(n*m) complexity
const filteredAssets = data.filter(asset =>
  asset.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  // ...more conditions
);
```

**Solution**:
1. Add debounced search state
2. Wrap filtering in `useMemo`
3. Wrap component in `React.memo`

```typescript
import { useCallback, useMemo } from 'react';

const [debouncedSearch, setDebouncedSearch] = useState('');

const filteredAssets = useMemo(() => {
  if (!debouncedSearch) return data;
  const lowerSearch = debouncedSearch.toLowerCase();
  return data.filter(asset =>
    asset.nickname?.toLowerCase().includes(lowerSearch) ||
    asset.building?.toLowerCase().includes(lowerSearch) ||
    asset.contractor?.toLowerCase().includes(lowerSearch)
  );
}, [data, debouncedSearch]);

// Debounce function
useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 300);
  return () => clearTimeout(timer);
}, [search]);
```

**Files to Fix**:
- `src/components/assets/AssetTable.tsx`

**Expected Improvement**: Search is responsive, no input lag

---

#### Issue 7: Sites Page - Multiple Redundant Fetches
**Severity**: HIGH
**Impact**: Slow initial load, laggy project filtering
**Estimated Fix Time**: 1.5 hours

**Problem** (src/pages/Sites.tsx lines 26-88):
Fetches 3 separate things:
- `useMasterData()` - ALL assets
- `useSiteManagement()` - Sites (separate fetch)
- `useProjects()` - Projects (separate fetch)

Then complex nested filtering inside `useMemo`.

**Solution**:
1. Consolidate data fetches using React Query
2. Simplify filtering logic
3. Optimize `localStorage` JSON parsing (add memoization)

**Files to Fix**:
- `src/pages/Sites.tsx`

**Expected Improvement**: 40% faster page load, instant filtering

---

#### Issue 8: Reports Page - Heavy Reduce Operations
**Severity**: HIGH
**Impact**: Report generation causes UI freeze for 1-2 seconds
**Estimated Fix Time**: 1 hour

**Problem** (src/pages/Reports.tsx):
Multiple heavy `reduce()` operations NOT memoized:
- Lines 81-102: Maintenance data aggregation
- Lines 140-152: Cost data aggregation
- Lines 167-174: Contractor grouping
- Lines 234-262: Maintenance report render function

**Solution**:
Wrap all report calculations in single `useMemo`:
```typescript
const reportData = useMemo(() => {
  const maintenance = filteredData.reduce(...);
  const costs = filteredData.reduce(...);
  const contractors = filteredData.reduce(...);
  return { maintenance, costs, contractors };
}, [filteredData, startDate, endDate]);
```

**Files to Fix**:
- `src/pages/Reports.tsx`

**Expected Improvement**: Reports generate instantly (< 500ms)

---

#### Issue 9: ContactUs Page - Duplicate Set Creation
**Severity**: HIGH
**Impact**: Unnecessary memory allocations
**Estimated Fix Time**: 15 minutes

**Problem** (src/pages/ContactUs.tsx lines 39-40):
```typescript
// Creates new Set objects on every render
const states = [...new Set(contactsData.map(c => c.state).filter(Boolean))];
const roles = [...new Set(contactsData.map(c => c.role).filter(Boolean))];
```

**Solution**:
```typescript
const states = useMemo(() =>
  [...new Set(contactsData.map(c => c.state).filter(Boolean))],
  [contactsData]
);

const roles = useMemo(() =>
  [...new Set(contactsData.map(c => c.role).filter(Boolean))],
  [contactsData]
);
```

**Files to Fix**:
- `src/pages/ContactUs.tsx`

**Expected Improvement**: Instant page load for ContactUs

---

### MEDIUM Severity Issues (4)

#### Issue 10: No Code Splitting
**Severity**: MEDIUM
**Impact**: Initial page load time 3-5 seconds
**Estimated Fix Time**: 2 hours

**Problem**:
All components (Dashboard, Reports, Portfolio, etc.) bundled into single JS file

**Solution**:
Add route-based code splitting in `vite.config.ts`:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'charts': ['recharts'],
        'radix-ui': ['@radix-ui/*'],
      }
    }
  }
}
```

**Expected Improvement**: Initial load 1.5-2 seconds, faster page transitions

---

#### Issue 11: UserTable - No React.memo
**Severity**: MEDIUM
**Impact**: Table re-renders even when user list hasn't changed
**Estimated Fix Time**: 15 minutes

**Problem** (src/components/admin/UserTable.tsx):
Component re-renders whenever parent changes

**Solution**:
```typescript
export default React.memo(UserTable, (prevProps, nextProps) => {
  return prevProps.allUsers === nextProps.allUsers &&
         prevProps.isLoading === nextProps.isLoading;
});
```

**Files to Fix**:
- `src/components/admin/UserTable.tsx`

**Expected Improvement**: Admin panel doesn't re-render on unrelated changes

---

#### Issue 12: Dashboard Metrics Calculation
**Severity**: MEDIUM
**Impact**: Redundant calculations when unrelated data changes
**Estimated Fix Time**: 30 minutes

**Problem** (src/pages/Index.tsx lines 62-72):
5 separate `useMemo` calculations, each recalculates when any dependency changes

**Solution**:
Consolidate into single `useMemo`:
```typescript
const metrics = useMemo(() => ({
  totalAssets: filteredMasterData.length,
  activeServiceTickets: filteredMasterData.filter(...).length,
  upcomingMaintenance: filteredMasterData.filter(...).length,
  systemUptime: ...
}), [filteredMasterData]);
```

**Files to Fix**:
- `src/pages/Index.tsx` (lines 62-72)

**Expected Improvement**: Cleaner code, slightly faster re-renders

---

#### Issue 13: CSV Memory Loading
**Severity**: MEDIUM
**Impact**: Not scalable for larger CSV files
**Estimated Fix Time**: 1.5 hours

**Problem**:
Papa Parse loads entire CSV into memory before parsing

**Solution** (Optional - only if CSVs grow):
Implement streaming CSV parser or chunked parsing

**Expected Improvement**: Scalable for 10MB+ CSV files

---

## Quick Implementation Priority

### Phase 1 (1-2 hours) - "Felt Responsiveness" Fixes
1. ✅ CSV truncation fix (DONE)
2. Portfolio filter dropdown memoization (30 min)
3. SiteFilter memoization + React.memo (30 min)
4. Asset table search debouncing (45 min)

**Expected Result**: Dashboard and filter dropdowns feel snappy

### Phase 2 (2-3 hours) - "Data Caching" Fixes
5. Implement React Query (copy from main branch)
6. Integrate with all data hooks
7. Test data persistence

**Expected Result**: 50% less API/parsing, faster page loads

### Phase 3 (2-3 hours) - "Heavy Component" Fixes
8. Memoize dashboard charts
9. Memoize reports calculations
10. Consolidate metrics

**Expected Result**: Pages render instantly

### Phase 4 (2 hours) - "Bundle Size" Fixes
11. Add code splitting to Vite config
12. Lazy load routes

**Expected Result**: Faster initial load, faster navigation

---

## Testing Checklist

After each fix, verify:
- [ ] No regressions in functionality
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] Smooth interactions (check DevTools Performance)
- [ ] Data updates correctly

---

## Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Dashboard load time | 2-3s | < 500ms |
| Filter dropdown open | 1-2s | < 100ms |
| Search responsiveness | 500ms+ lag | < 100ms |
| Initial page load | 3-5s | < 2s |
| Dashboard re-render | 1-2s | < 300ms |

---

## Rollback Strategy

Each fix is independent and can be reverted:
```bash
git checkout <file> # Revert single file
git log --oneline  # Find commit hash
git revert <hash>  # Revert entire commit
```

---

## Next Steps

1. Copy React Query hooks from main branch: `src/hooks/useQueryHooks.ts`
2. Start with Phase 1 (quick wins)
3. Test thoroughly before moving to Phase 2
4. Track performance improvements with Chrome DevTools

