/**
 * Query domain entity
 */
import { IQuery, IPopulateOption } from '../../shared/contracts';

export class Query implements IQuery {
  public collection: string;
  public filter?: Record<string, any>;
  public select?: string[];
  public sort?: Record<string, 1 | -1>;
  public limit?: number;
  public skip?: number;
  public populate?: IPopulateOption[];
  
  private _hash?: string;

  constructor(data: IQuery) {
    // Validation
    if (!data.collection || data.collection.trim() === '') {
      throw new Error('Collection name is required');
    }
    if (data.limit !== undefined && data.limit < 0) {
      throw new Error('Limit must be a positive number');
    }
    if (data.skip !== undefined && data.skip < 0) {
      throw new Error('Skip must be a non-negative number');
    }

    this.collection = data.collection;
    this.filter = data.filter || {};
    this.select = data.select;
    this.sort = data.sort;
    this.limit = data.limit;
    this.skip = data.skip;
    this.populate = data.populate;
  }

  /**
   * Get a unique hash for this query (useful for caching)
   */
  public hash(): string {
    if (!this._hash) {
      const queryData = {
        collection: this.collection,
        filter: this.filter,
        select: this.select,
        sort: this.sort,
        limit: this.limit,
        skip: this.skip,
        populate: this.populate
      };
      this._hash = this.generateHash(JSON.stringify(queryData));
    }
    return this._hash;
  }

  /**
   * Clone the query
   */
  public clone(): Query {
    return new Query({
      collection: this.collection,
      filter: { ...this.filter },
      select: this.select ? [...this.select] : undefined,
      sort: this.sort ? { ...this.sort } : undefined,
      limit: this.limit,
      skip: this.skip,
      populate: this.populate ? JSON.parse(JSON.stringify(this.populate)) : undefined
    });
  }

  /**
   * Add pagination
   */
  public paginate(page: number, pageSize: number): Query {
    const cloned = this.clone();
    cloned.limit = pageSize;
    cloned.skip = (page - 1) * pageSize;
    return cloned;
  }

  /**
   * Add sorting
   */
  public sortBy(field: string, direction: 1 | -1 = 1): Query {
    const cloned = this.clone();
    cloned.sort = cloned.sort || {};
    cloned.sort[field] = direction;
    return cloned;
  }

  /**
   * Add field selection
   */
  public selectFields(...fields: string[]): Query {
    const cloned = this.clone();
    cloned.select = [...(cloned.select || []), ...fields];
    return cloned;
  }

  /**
   * Add filter condition
   */
  public where(field: string, value: any): Query {
    const cloned = this.clone();
    cloned.filter = cloned.filter || {};
    cloned.filter[field] = value;
    return cloned;
  }

  /**
   * Add population
   */
  public withPopulate(populate: IPopulateOption): Query {
    const cloned = this.clone();
    cloned.populate = [...(cloned.populate || []), populate];
    return cloned;
  }

  /**
   * Check if query has pagination
   */
  public hasPagination(): boolean {
    return this.limit !== undefined || this.skip !== undefined;
  }

  /**
   * Check if query has filters
   */
  public hasFilters(): boolean {
    return this.filter !== undefined && Object.keys(this.filter).length > 0;
  }

  /**
   * Get total pages for a given count
   */
  public getTotalPages(totalCount: number): number {
    if (!this.limit) return 1;
    return Math.ceil(totalCount / this.limit);
  }

  /**
   * Get current page
   */
  public getCurrentPage(): number {
    if (!this.limit || !this.skip) return 1;
    return Math.floor(this.skip / this.limit) + 1;
  }

  /**
   * Check if query has sorting
   */
  public hasSorting(): boolean {
    return this.sort !== undefined && Object.keys(this.sort).length > 0;
  }

  /**
   * Get query complexity estimate
   */
  public getComplexity(): number {
    let complexity = 0;
    
    // Base complexity
    complexity += 1;
    
    // Filter complexity
    if (this.filter && Object.keys(this.filter).length > 0) {
      complexity += Object.keys(this.filter).length * 2;
    }
    
    // Sort complexity
    if (this.hasSorting()) {
      complexity += Object.keys(this.sort!).length;
    }
    
    // Population complexity
    if (this.populate && this.populate.length > 0) {
      complexity += this.populate.length * 3;
    }
    
    return complexity;
  }

  /**
   * Get index suggestions for this query
   */
  public getIndexSuggestions(): string[] {
    const suggestions: string[] = [];
    
    // Filter fields
    if (this.filter) {
      suggestions.push(...Object.keys(this.filter));
    }
    
    // Sort fields
    if (this.sort) {
      suggestions.push(...Object.keys(this.sort));
    }
    
    return [...new Set(suggestions)];
  }

  /**
   * Get performance warnings
   */
  public getPerformanceWarnings(): string[] {
    const warnings: string[] = [];
    
    // Check for regex filters
    if (this.filter) {
      for (const [key, value] of Object.entries(this.filter)) {
        if (value && typeof value === 'object' && value.$regex) {
          warnings.push('regex_filter');
          break;
        }
      }
    }
    
    // Check for multiple populates
    if (this.populate && this.populate.length > 2) {
      warnings.push('multiple_populates');
    }
    
    return warnings;
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): any {
    return {
      collection: this.collection,
      filter: this.filter,
      select: this.select,
      sort: this.sort,
      limit: this.limit,
      skip: this.skip,
      populate: this.populate
    };
  }

  /**
   * Create Query from JSON
   */
  public static fromJSON(data: any): Query {
    return new Query(data);
  }

  private generateHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}