# Web UI Future Improvements

This document tracks enhancements and features that can be added to the web UI after the initial production release.

## Endpoint Health Page Enhancements

### Health Metrics Visualization
- Add charts/graphs for success rate over time
- Show trends with interactive visualizations
- Add configurable time range filter (24h, 7d, 30d)

### Recent Failures Section
- Display last 5-10 failed runs
- Show error messages inline
- Quick links to run details
- Requires additional API endpoint to fetch filtered runs

### Additional Metrics Display
- Show failure streak information (using `health.failureStreak`)
- Display last run status and timestamp (using `health.lastRun`)
- Add average response time graph
- Show uptime percentage

## Run Details Page Enhancements

### Scheduling Information Card
Currently shows placeholder text. Should display:
- Next scheduled run time
- Current interval configuration
- Active AI hints (if any)
- Baseline schedule (cron or interval)
- Min/max interval constraints

This requires fetching endpoint configuration along with run details.

## Dashboard Components

### Testing
From `src/components/dashboard-new/README.md`:

#### Unit Tests
- Test loading states for all components
- Test error states and error boundaries
- Verify metrics display correctly from API
- Test trend badges display logic
- Test chart time range switching
- Test date formatting
- Test table pagination, sorting, and filtering

#### Integration Tests
- Test with real API responses
- Test query refetching behavior
- Test error boundary handling
- Verify data flow from API to components

## General Enhancements

### Performance
- Implement virtual scrolling for large tables
- Add data caching strategies
- Prefetch next page of data
- Consider code splitting for the large dashboard chunk (430KB)

### Real-time Updates
- Add WebSocket connection for live dashboard updates
- Show "new data available" toast notification
- Auto-refresh on schedule

### Export Functionality
- Export table data as CSV/JSON
- Download charts as PNG
- Generate PDF reports

### Enhanced Filtering
- Add filter by job name in data tables
- Add search functionality to more views
- Save filter preferences

### Endpoint Details Drawer
- Click endpoint name to open drawer with:
  - Run history chart
  - Configuration details
  - Edit capabilities (pause, resume, modify schedule)

### Status Tracking
- Add "paused" status indicators in endpoint rows
- Show AI hint indicators
- Display next scheduled run time in lists

### Accessibility
- Complete WCAG AA compliance audit
- Add keyboard shortcuts for common actions
- Improve screen reader support
- Add high contrast mode

### Error Handling
- Improve error messages to be more user-friendly
- Add retry functionality for failed operations
- Better offline support

## API Client Improvements

### Error Formatting
The `format-api-error.ts` utility can be enhanced to:
- Better format Zod validation errors
- Provide user-friendly error messages
- Include suggestions for fixing errors
- Support internationalization

## Mobile Experience

### Optimizations Needed
- Improve table views on small screens
- Add swipe gestures for common actions
- Optimize chart rendering for mobile
- Test and improve touch interactions

## Documentation

### User Documentation
- Create user guide for common workflows
- Add tooltips for complex features
- Create video tutorials
- FAQ section

### Developer Documentation
- Document component APIs
- Add inline comments for complex logic
- Create architecture diagrams
- Document API integration patterns

## Security

### Enhancements
- Add rate limiting indicators in UI
- Show API key usage statistics
- Add audit log viewer
- Implement session timeout warnings

## Notes

All improvements should maintain:
- Consistency with existing shadcn components
- Clean, minimal, maintainable code
- TanStack Router best practices
- Proper TypeScript typing
- Responsive design principles

Priority should be given to improvements that:
1. Enhance core user workflows
2. Improve reliability and error handling
3. Provide better visibility into system status
4. Reduce user confusion or support burden
