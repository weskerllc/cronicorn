# Timeline Chart Y-Axis Bounds Fix

## Issue
Dashboard timeline charts (Execution Timeline and AI Sessions) were showing stacked area lines extending beyond the chart boundaries - going above the top axis and potentially below the bottom axis.

## Root Cause

### Technical Explanation
The charts use Recharts' stacked area charts with `stackId="a"`, which causes data series to stack vertically. However, the Y-axis was configured with:

```tsx
<YAxis domain={[0, 'auto']} />
```

The `'auto'` domain calculation in Recharts only considers individual data series values, not the cumulative sum of stacked values. This means:

1. If Endpoint A has max value of 50
2. And Endpoint B has max value of 40
3. Recharts calculates domain as `[0, 50]` (the max individual value)
4. But when stacked, the total can be up to 90 at some data points
5. Result: The chart line extends beyond the calculated bounds

### Visual Example

**Before Fix:**
```
100 |                    /‾‾‾‾‾‾‾‾ (line extends beyond axis!)
 80 |           /‾‾‾‾‾‾‾/
 60 |      /‾‾‾/
 40 | /‾‾‾/
 20 |/
  0 |________________________________
```

**After Fix:**
```
110 |
 90 |                    /‾‾‾‾‾‾‾
 70 |           /‾‾‾‾‾‾‾/
 50 |      /‾‾‾/
 30 | /‾‾‾/
 10 |/
  0 |________________________________
```

## Solution

### Implementation
Added a `maxStackedValue` calculation using `useMemo` in both charts:

```typescript
const maxStackedValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    
    // For each data point, sum all endpoint values to get the stacked total
    const maxValue = chartData.reduce((max, dataPoint) => {
        const stackedTotal = endpoints.reduce((sum, endpoint) => {
            const value = dataPoint[endpoint.name];
            return sum + (typeof value === 'number' ? value : 0);
        }, 0);
        return Math.max(max, stackedTotal);
    }, 0);
    
    // Add 10% padding to prevent touching the top
    return maxValue * 1.1;
}, [chartData, endpoints]);
```

Then updated the YAxis domain:

```typescript
<YAxis domain={[0, maxStackedValue || 'auto']} />
```

### Key Features
1. **Accurate Bounds**: Calculates the true maximum by summing stacked values at each data point
2. **Safety Padding**: Adds 10% extra space above to prevent lines from touching the top axis
3. **Fallback**: Uses `'auto'` if calculation fails or returns 0
4. **Performance**: Memoized with proper dependencies to avoid unnecessary recalculations
5. **Robustness**: Handles missing values and non-numeric data gracefully

## Files Changed

### Modified
- `apps/web/src/components/dashboard-new/execution-timeline-chart.tsx` (+19 lines)
- `apps/web/src/components/dashboard-new/ai-sessions-chart.tsx` (+19 lines)

### Added
- `apps/web/src/lib/__tests__/chart-domain.test.ts` (124 lines of tests)

## Testing

### Unit Tests (7 passing)
1. ✅ Returns 0 for empty chart data
2. ✅ Calculates correct max for single endpoint
3. ✅ Calculates correct max for multiple stacked endpoints
4. ✅ Handles missing values as 0
5. ✅ Ignores non-numeric values
6. ✅ Handles many endpoints with varying values
7. ✅ Ensures padding prevents chart from touching top axis

### Example Test Case
```typescript
it('calculates correct max for multiple stacked endpoints', () => {
  const chartData = [
    { date: 1000, 'endpoint-1': 10, 'endpoint-2': 5 },
    { date: 2000, 'endpoint-1': 20, 'endpoint-2': 15 }, // Max stacked: 35
    { date: 3000, 'endpoint-1': 15, 'endpoint-2': 10 },
  ];
  const endpoints = [
    { id: 'ep1', name: 'endpoint-1' },
    { id: 'ep2', name: 'endpoint-2' },
  ];
  
  const result = calculateMaxStackedValue(chartData, endpoints);
  // Max stacked value is 35, with 10% padding = 38.5
  expect(result).toBe(38.5);
});
```

## Quality Checks

✅ **Build**: Successful compilation  
✅ **Linting**: No errors or warnings  
✅ **Tests**: 7/7 passing  
✅ **Security**: CodeQL scan passed with 0 alerts  
✅ **Type Safety**: Full TypeScript coverage  

## Impact

### User Experience
- Charts now display correctly with all data visible within bounds
- Consistent 10% padding provides visual breathing room
- No data clipping or overflow

### Performance
- Minimal impact: O(n×m) where n = data points, m = endpoints
- Memoized calculation prevents unnecessary re-computation
- Typical dashboard has ~10 endpoints × 24-30 data points = ~300 operations

### Maintenance
- Clear, well-documented code
- Comprehensive test coverage
- Follows existing patterns in the codebase
- No breaking changes

## Related Issues
This fix resolves the issue: "Timelines on dashboard - the lines sometimes go below the bottom axis and above the top axis"

## Client vs Server

**Updated Approach: Server-Side Calculation**

Based on performance feedback, the calculation was moved to the server for better scalability:

### Why Server-Side?
1. **Performance**: Calculation happens once on server vs. on every client render
2. **Scalability**: Better for large datasets (more endpoints, longer time ranges)
3. **Efficiency**: Server already has aggregated data in memory
4. **Network Cost**: Only +16 bytes (2 numbers) per API response

### Implementation
**Server (`DashboardManager`):**
- Added `calculateMaxStackedValue` helper method
- Calculates during data aggregation: O(n) where n = time series points
- Returns `endpointTimeSeriesMaxStacked` and `aiSessionTimeSeriesMaxStacked`

**Client (Chart Components):**
- Accept optional `maxStackedValue` prop from server
- Prefer server-calculated value for performance
- Fallback to client-side calculation if not provided (backward compatibility)

### Performance Comparison
| Approach | When Calculated | Cost | Dataset Size Impact |
|----------|----------------|------|---------------------|
| Client-only (old) | Every render | O(d × e) per chart | Scales linearly with data |
| Server-side (new) | Once on server | O(n) total | Constant client cost |

Where:
- d = number of dates in chart
- e = number of endpoints displayed (up to 10)
- n = total time series points

### Backward Compatibility
Client-side calculation remains as fallback, ensuring the fix works even if:
- Server doesn't provide the value (old API version)
- Server value is 0 or undefined
- Integration with other data sources
