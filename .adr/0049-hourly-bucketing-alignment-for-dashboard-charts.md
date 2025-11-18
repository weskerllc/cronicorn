# Hourly Bucketing Alignment for Dashboard Timeline Charts

**Date:** 2025-11-18
**Status:** Accepted

## Context

Dashboard timeline charts were displaying empty data for 24-hour views despite runs existing in the database. Investigation revealed a time bucket alignment mismatch between the SQL aggregation queries and the frontend zero-filling logic.

### The Problem

When filtering by "Last 24 Hours", the dashboard was expected to show hourly data points but was displaying all zeros:

1. **SQL Layer**: Repository queries used `DATE_TRUNC('hour', started_at)` which rounds timestamps DOWN to the hour boundary (e.g., `19:05:23` → `19:00:00`)

2. **Service Layer**: The `DashboardManager` generated hourly buckets using:
   ```typescript
   const date = new Date(now.getTime() - i * 60 * 60 * 1000);
   const dateStr = `${date.toISOString().slice(0, 13)}:00:00`;
   ```
   This created buckets at arbitrary times based on when the query ran (e.g., if run at `19:36:28`, buckets would be `19:36:00`, `18:36:00`, etc.)

3. **Result**: Data aggregated at `19:00:00` couldn't match a bucket expecting `19:36:00`, causing all data points to be zero-filled.

### Seed Data Issue

After fixing the bucketing, a fresh seed with `SEED_HISTORICAL_DATA=true` still showed empty charts. The seed script generates runs spanning 45 days but the dashboard was requesting data from the wrong time range due to the bucketing logic generating incorrect `sinceDate` calculations.

## Decision

### 1. Align Hourly Buckets to Hour Boundaries

Changed the bucket generation logic to align with SQL's `DATE_TRUNC('hour')` behavior:

```typescript
// Before: Buckets aligned to current time's minutes/seconds
const date = new Date(now.getTime() - i * 60 * 60 * 1000);

// After: Buckets aligned to hour boundaries (00:00, 01:00, etc.)
const currentHourStart = new Date(now);
currentHourStart.setMinutes(0, 0, 0);
const date = new Date(currentHourStart.getTime() - i * 60 * 60 * 1000);
```

Applied to three time series methods:
- `getRunTimeSeries()` - Overall run counts by hour/day
- `getEndpointTimeSeries()` - Per-endpoint run counts by hour/day  
- `getAISessionTimeSeries()` - AI analysis sessions by hour/day

### 2. Fixed Date Formatting

Replaced ISO string slicing with explicit date formatting for consistency:

```typescript
// Before: Using ISO string slicing
const dateStr = `${date.toISOString().slice(0, 13)}:00:00`;

// After: Explicit formatting matching SQL output
const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00:00`;
```

### 3. Granularity Selection

Maintained the existing granularity strategy:
- **24h view**: Hourly buckets (24 data points)
- **7d view**: Daily buckets (7 data points)
- **30d view**: 3-day buckets (10 data points)
- **All time**: Caps at 30 days with 3-day buckets

## Consequences

### Positive

1. **Data Visibility**: Charts now correctly display historical data for all time ranges
2. **Performance**: Server-side bucketing reduces data transfer (e.g., 30 days → 10 buckets instead of 30)
3. **Consistency**: SQL aggregation and frontend rendering use identical time boundaries
4. **Test Coverage**: Added 7 comprehensive tests for hourly bucketing behavior

### Code Changes

**Modified Files:**
- `packages/services/src/dashboard/manager.ts` - All three time series methods
- `packages/services/src/dashboard/__tests__/manager.test.ts` - Fixed failing test, added hourly bucket tests

**Test Additions:**
- Hourly granularity validation for 24h timeRange
- Hour boundary alignment verification  
- Daily granularity validation for 7d timeRange
- 3-day bucket validation for 30d timeRange
- Hourly data aggregation from repositories
- Endpoint time series with hourly buckets
- AI session time series with hourly buckets

### Technical Debt

None introduced. This fix aligns the implementation with the original intent and SQL behavior.

### Migration Notes

No migration required. This is a frontend/service layer fix that doesn't affect database schema or stored data.

## References

**Related Tasks**: Dashboard timeline chart display issue (user-reported bug)  
**Related ADRs**: None  
**Files Modified**:
- `packages/services/src/dashboard/manager.ts` (lines 330-370, 456-490, 598-630)
- `packages/services/src/dashboard/__tests__/manager.test.ts` (added 7 tests, fixed 1 test)
