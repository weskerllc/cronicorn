import { describe, it, expect } from 'vitest';

/**
 * Calculate maximum stacked value for Y-axis domain in stacked area charts.
 * This utility mirrors the logic used in ExecutionTimelineChart and AISessionsChart.
 */
function calculateMaxStackedValue(
  chartData: Array<Record<string, string | number>>,
  endpoints: Array<{ id: string; name: string }>
): number {
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
}

describe('chart-domain', () => {
  describe('calculateMaxStackedValue', () => {
    it('returns 0 for empty chart data', () => {
      const result = calculateMaxStackedValue([], []);
      expect(result).toBe(0);
    });

    it('calculates correct max for single endpoint', () => {
      const chartData = [
        { date: 1000, 'endpoint-1': 10 },
        { date: 2000, 'endpoint-1': 20 },
        { date: 3000, 'endpoint-1': 15 },
      ];
      const endpoints = [{ id: 'ep1', name: 'endpoint-1' }];
      
      const result = calculateMaxStackedValue(chartData, endpoints);
      // Max value is 20, with 10% padding = 22
      expect(result).toBe(22);
    });

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

    it('handles missing values as 0', () => {
      const chartData: Array<Record<string, string | number>> = [
        { date: 1000, 'endpoint-1': 10 }, // endpoint-2 missing
        { date: 2000, 'endpoint-1': 20, 'endpoint-2': 15 },
      ];
      const endpoints = [
        { id: 'ep1', name: 'endpoint-1' },
        { id: 'ep2', name: 'endpoint-2' },
      ];
      
      const result = calculateMaxStackedValue(chartData, endpoints);
      // Max stacked value is 35 (20 + 15), with 10% padding = 38.5
      expect(result).toBe(38.5);
    });

    it('ignores non-numeric values', () => {
      const chartData: Array<Record<string, string | number>> = [
        { date: 1000, 'endpoint-1': 10, 'endpoint-2': 'invalid' },
        { date: 2000, 'endpoint-1': 20, 'endpoint-2': 15 },
      ];
      const endpoints = [
        { id: 'ep1', name: 'endpoint-1' },
        { id: 'ep2', name: 'endpoint-2' },
      ];
      
      const result = calculateMaxStackedValue(chartData, endpoints);
      // First point: 10 + 0 (invalid ignored) = 10
      // Second point: 20 + 15 = 35 (max)
      // With 10% padding = 38.5
      expect(result).toBe(38.5);
    });

    it('handles many endpoints with varying values', () => {
      const chartData = [
        { date: 1000, 'ep-1': 5, 'ep-2': 3, 'ep-3': 2, 'ep-4': 1 },
        { date: 2000, 'ep-1': 10, 'ep-2': 8, 'ep-3': 6, 'ep-4': 4 }, // Max: 28
        { date: 3000, 'ep-1': 3, 'ep-2': 2, 'ep-3': 1, 'ep-4': 1 },
      ];
      const endpoints = [
        { id: '1', name: 'ep-1' },
        { id: '2', name: 'ep-2' },
        { id: '3', name: 'ep-3' },
        { id: '4', name: 'ep-4' },
      ];
      
      const result = calculateMaxStackedValue(chartData, endpoints);
      // Max stacked value is 28, with 10% padding = 30.8
      expect(result).toBeCloseTo(30.8, 5);
    });

    it('ensures padding prevents chart from touching top axis', () => {
      const chartData = [
        { date: 1000, 'endpoint-1': 100 },
      ];
      const endpoints = [{ id: 'ep1', name: 'endpoint-1' }];
      
      const result = calculateMaxStackedValue(chartData, endpoints);
      // With 10% padding, max of 100 becomes 110
      expect(result).toBeGreaterThan(100);
      expect(result).toBeCloseTo(110, 5);
    });
  });
});
