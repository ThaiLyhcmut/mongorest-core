/**
 * Query optimizer for improving query performance
 */
import { IQuery, IQueryOptimizer, IQueryAnalysis } from '../../shared/contracts';
import { Query } from '../../domain/entities/Query';

export class QueryOptimizer implements IQueryOptimizer {
  private indexHints: Map<string, string[]> = new Map();
  private queryPatterns: Map<string, QueryPattern> = new Map();
  private performanceHistory: Map<string, PerformanceMetric[]> = new Map();

  /**
   * Optimize a query based on patterns and performance history
   */
  public async optimize(query: IQuery): Promise<IQuery> {
    const queryEntity = new Query(query);
    const pattern = this.identifyPattern(queryEntity);
    
    // Apply optimizations based on pattern
    let optimized = this.applyPatternOptimizations(queryEntity, pattern);
    
    // Apply index hints
    optimized = this.applyIndexHints(optimized);
    
    // Apply performance-based optimizations
    optimized = this.applyPerformanceOptimizations(optimized);
    
    return optimized;
  }

  /**
   * Analyze a query and provide recommendations
   */
  public async analyze(query: IQuery): Promise<IQueryAnalysis> {
    const queryEntity = new Query(query);
    const pattern = this.identifyPattern(queryEntity);
    const cost = this.estimateCost(queryEntity);
    const suggestedIndexes = this.suggestIndexes(queryEntity);
    const warnings = this.generateWarnings(queryEntity);

    return {
      estimatedCost: cost,
      suggestedIndexes,
      warnings,
      executionPlan: {
        pattern: pattern.name,
        optimizations: pattern.optimizations,
        estimatedRows: this.estimateRows(queryEntity)
      }
    };
  }

  /**
   * Record query performance for learning
   */
  public recordPerformance(query: IQuery, duration: number, rowCount: number): void {
    const hash = new Query(query).hash();
    
    if (!this.performanceHistory.has(hash)) {
      this.performanceHistory.set(hash, []);
    }
    
    const metrics = this.performanceHistory.get(hash)!;
    metrics.push({
      duration,
      rowCount,
      timestamp: Date.now()
    });
    
    // Keep only last 100 metrics
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    // Update patterns based on performance
    this.updatePatterns(query, metrics);
  }

  /**
   * Add index hint for a collection
   */
  public addIndexHint(collection: string, fields: string[]): void {
    if (!this.indexHints.has(collection)) {
      this.indexHints.set(collection, []);
    }
    
    const hints = this.indexHints.get(collection)!;
    const hint = fields.join(',');
    
    if (!hints.includes(hint)) {
      hints.push(hint);
    }
  }

  private identifyPattern(query: Query): QueryPattern {
    // Check for common patterns
    if (this.isPaginationPattern(query)) {
      return {
        name: 'pagination',
        optimizations: ['limit-optimization', 'skip-optimization']
      };
    }
    
    if (this.isSearchPattern(query)) {
      return {
        name: 'search',
        optimizations: ['text-index', 'field-projection']
      };
    }
    
    if (this.isAggregationPattern(query)) {
      return {
        name: 'aggregation',
        optimizations: ['pipeline-optimization', 'index-usage']
      };
    }
    
    if (this.isLookupPattern(query)) {
      return {
        name: 'lookup',
        optimizations: ['join-optimization', 'batch-lookup']
      };
    }
    
    return {
      name: 'simple',
      optimizations: ['basic-optimization']
    };
  }

  private applyPatternOptimizations(query: Query, pattern: QueryPattern): IQuery {
    const optimized = query.clone();
    
    switch (pattern.name) {
      case 'pagination':
        // Optimize pagination queries
        if (optimized.skip && optimized.skip > 1000) {
          // Use cursor-based pagination for large offsets
          (optimized as any)._hint = 'use-cursor';
        }
        break;
        
      case 'search':
        // Optimize search queries
        if (optimized.filter && this.hasTextSearch(optimized.filter)) {
          (optimized as any)._hint = 'text-index';
        }
        break;
        
      case 'aggregation':
        // Optimize aggregation queries
        if (optimized.sort && optimized.limit) {
          // Push sort before limit in pipeline
          (optimized as any)._pipelineOrder = ['match', 'sort', 'limit'];
        }
        break;
        
      case 'lookup':
        // Optimize lookup queries
        if (optimized.populate && optimized.populate.length > 2) {
          // Batch lookups for better performance
          (optimized as any)._batchLookup = true;
        }
        break;
    }
    
    return optimized;
  }

  private applyIndexHints(query: IQuery): IQuery {
    const hints = this.indexHints.get(query.collection);
    
    if (!hints || hints.length === 0) {
      return query;
    }
    
    // Find best matching index
    const bestIndex = this.findBestIndex(query, hints);
    
    if (bestIndex) {
      (query as any)._indexHint = bestIndex;
    }
    
    return query;
  }

  private applyPerformanceOptimizations(query: IQuery): IQuery {
    const queryEntity = new Query(query);
    const hash = queryEntity.hash();
    const metrics = this.performanceHistory.get(hash);
    
    if (!metrics || metrics.length < 10) {
      return query;
    }
    
    // Calculate average performance
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const avgRows = metrics.reduce((sum, m) => sum + m.rowCount, 0) / metrics.length;
    
    // Apply optimizations based on performance
    if (avgDuration > 1000 && avgRows < 100) {
      // Slow query with few results - likely missing index
      (query as any)._performanceWarning = 'missing-index';
    }
    
    if (avgRows > 10000 && !query.limit) {
      // Large result set without limit
      query.limit = 1000;
      (query as any)._autoLimit = true;
    }
    
    return query;
  }

  private estimateCost(query: Query): number {
    let cost = 10; // Base cost
    
    // Filter cost
    if (query.hasFilters()) {
      const filterComplexity = this.calculateFilterComplexity(query.filter!);
      cost += filterComplexity * 5;
    }
    
    // Sort cost
    if (query.sort) {
      cost += Object.keys(query.sort).length * 20;
    }
    
    // Population cost
    if (query.populate) {
      cost += query.populate.length * 50;
    }
    
    // Pagination cost
    if (query.skip) {
      cost += Math.log10(query.skip + 1) * 10;
    }
    
    return Math.round(cost);
  }

  private calculateFilterComplexity(filter: Record<string, any>): number {
    let complexity = 0;
    
    for (const [key, value] of Object.entries(filter)) {
      if (key.startsWith('$')) {
        // Logical operator
        complexity += 2;
        if (Array.isArray(value)) {
          complexity += value.length;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Nested condition
        complexity += 1.5;
        complexity += this.calculateFilterComplexity(value);
      } else {
        // Simple condition
        complexity += 1;
      }
    }
    
    return complexity;
  }

  private suggestIndexes(query: Query): string[] {
    const suggestions: string[] = [];
    
    if (!query.filter) {
      return suggestions;
    }
    
    // Suggest indexes for filter fields
    const filterFields = this.extractFilterFields(query.filter);
    
    // Single field indexes
    for (const field of filterFields) {
      suggestions.push(field);
    }
    
    // Compound indexes for common combinations
    if (filterFields.length > 1) {
      // Sort fields by selectivity (estimated)
      const sorted = filterFields.sort((a, b) => {
        const aSelectivity = this.estimateSelectivity(a);
        const bSelectivity = this.estimateSelectivity(b);
        return bSelectivity - aSelectivity;
      });
      
      suggestions.push(sorted.join(','));
    }
    
    // Add sort fields to compound indexes
    if (query.sort) {
      const sortFields = Object.keys(query.sort);
      for (const sortField of sortFields) {
        if (!filterFields.includes(sortField)) {
          suggestions.push(`${filterFields.join(',')},${sortField}`);
        }
      }
    }
    
    return suggestions;
  }

  private generateWarnings(query: Query): string[] {
    const warnings: string[] = [];
    
    // Check for missing limit on large collections
    if (!query.limit) {
      warnings.push('No limit specified - consider adding limit to prevent large result sets');
    }
    
    // Check for large skip values
    if (query.skip && query.skip > 1000) {
      warnings.push('Large skip value detected - consider using cursor-based pagination');
    }
    
    // Check for non-indexed sorts
    if (query.sort && !query.filter) {
      warnings.push('Sorting without filtering - ensure sort fields are indexed');
    }
    
    // Check for deep population
    if (query.populate) {
      const maxDepth = this.calculatePopulationDepth(query.populate);
      if (maxDepth > 3) {
        warnings.push('Deep population detected - consider denormalizing data');
      }
    }
    
    // Check for regex in filters
    if (query.filter && this.hasRegexFilter(query.filter)) {
      warnings.push('Regex filter detected - consider using text indexes for better performance');
    }
    
    return warnings;
  }

  private extractFilterFields(filter: Record<string, any>, prefix = ''): string[] {
    const fields: string[] = [];
    
    for (const [key, value] of Object.entries(filter)) {
      if (key.startsWith('$')) {
        // Logical operator
        if (Array.isArray(value)) {
          for (const condition of value) {
            fields.push(...this.extractFilterFields(condition, prefix));
          }
        }
      } else {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        fields.push(fullKey);
        
        if (typeof value === 'object' && value !== null && !value.$regex) {
          // Nested object (not regex)
          fields.push(...this.extractFilterFields(value, fullKey));
        }
      }
    }
    
    return [...new Set(fields)];
  }

  private findBestIndex(query: IQuery, indexes: string[]): string | null {
    if (!query.filter) {
      return null;
    }
    
    const filterFields = this.extractFilterFields(query.filter);
    let bestScore = 0;
    let bestIndex: string | null = null;
    
    for (const index of indexes) {
      const indexFields = index.split(',');
      let score = 0;
      
      // Score based on matching filter fields
      for (let i = 0; i < indexFields.length && i < filterFields.length; i++) {
        if (indexFields[i] === filterFields[i]) {
          score += 10 - i; // Higher score for earlier positions
        }
      }
      
      // Bonus for sort field match
      if (query.sort) {
        const sortFields = Object.keys(query.sort);
        for (const sortField of sortFields) {
          if (indexFields.includes(sortField)) {
            score += 5;
          }
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    
    return bestIndex;
  }

  private calculatePopulationDepth(populate: any[], depth = 1): number {
    let maxDepth = depth;
    
    for (const pop of populate) {
      if (pop.populate) {
        const childDepth = this.calculatePopulationDepth(pop.populate, depth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }
    
    return maxDepth;
  }

  private hasTextSearch(filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key === '$text') {
        return true;
      }
      if (typeof value === 'object' && value !== null) {
        if (this.hasTextSearch(value)) {
          return true;
        }
      }
    }
    return false;
  }

  private hasRegexFilter(filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (value && typeof value === 'object' && value.$regex) {
        return true;
      }
      if (typeof value === 'object' && value !== null) {
        if (this.hasRegexFilter(value)) {
          return true;
        }
      }
    }
    return false;
  }

  private estimateSelectivity(field: string): number {
    // Estimate selectivity based on field name patterns
    if (field === '_id' || field === 'id') return 1.0;
    if (field.includes('email')) return 0.9;
    if (field.includes('username')) return 0.9;
    if (field.includes('date') || field.includes('time')) return 0.7;
    if (field.includes('status')) return 0.3;
    if (field.includes('type')) return 0.4;
    if (field.includes('category')) return 0.5;
    
    return 0.5; // Default
  }

  private updatePatterns(query: IQuery, metrics: PerformanceMetric[]): void {
    // Update query patterns based on performance metrics
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    
    if (avgDuration > 1000) {
      // Slow query - analyze and create pattern
      const pattern = this.identifyPattern(new Query(query));
      const key = `${query.collection}:${pattern.name}`;
      
      if (!this.queryPatterns.has(key)) {
        this.queryPatterns.set(key, {
          ...pattern,
          optimizations: [...pattern.optimizations, 'performance-based']
        });
      }
    }
  }

  private isPaginationPattern(query: Query): boolean {
    return !!(query.limit || query.skip);
  }

  private isSearchPattern(query: Query): boolean {
    return !!(query.filter && (
      this.hasTextSearch(query.filter) ||
      this.hasRegexFilter(query.filter)
    ));
  }

  private isAggregationPattern(query: Query): boolean {
    return !!(query.filter && query.sort && (query.limit || query.populate));
  }

  private isLookupPattern(query: Query): boolean {
    return !!(query.populate && query.populate.length > 0);
  }

  private estimateRows(query: Query): number {
    // Simple estimation based on filters
    if (!query.filter || Object.keys(query.filter).length === 0) {
      return 10000; // No filter - assume large result
    }
    
    let estimate = 1000;
    const filterCount = Object.keys(query.filter).length;
    
    // Reduce estimate based on filter count
    estimate = Math.max(10, estimate / Math.pow(2, filterCount));
    
    if (query.limit) {
      estimate = Math.min(estimate, query.limit);
    }
    
    return Math.round(estimate);
  }
}

interface QueryPattern {
  name: string;
  optimizations: string[];
}

interface PerformanceMetric {
  duration: number;
  rowCount: number;
  timestamp: number;
}