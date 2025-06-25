import { EmbedRequest, JoinCondition, RelationshipDefinition } from "./types";

/**
 * Base Relationship class - đại diện cho một mối quan hệ giữa 2 tables
 */
export abstract class Relationship {
  protected definition: RelationshipDefinition;

  constructor(definition: RelationshipDefinition) {
    this.definition = definition;
  }

  abstract generateJoinCondition(): JoinCondition;
  abstract generateLookupStage(embedRequest: EmbedRequest): any;
  abstract isMultiResult(): boolean;

  // Getters
  get name(): string {
    return this.definition.name;
  }
  get targetTable(): string {
    return this.definition.targetTable;
  }
  get localField(): string {
    return this.definition.localField;
  }
  get foreignField(): string {
    return this.definition.foreignField;
  }
  get type(): string {
    return this.definition.type;
  }
  get junction(): any {
    return this.definition.junction;
  }

  /**
   * Validate relationship definition
   */
  validate(): boolean {
    return !!(
      this.definition.name &&
      this.definition.targetTable &&
      this.definition.localField &&
      this.definition.foreignField &&
      this.definition.type
    );
  }

  /**
   * Populate relationships in data (v2.0 compatibility)
   */
  async populate(data: any[], adapter: any): Promise<void> {
    // Simple implementation - would be enhanced in full version
    if (!data || data.length === 0) return;
    
    // Extract IDs to fetch related data
    const ids = data
      .map(item => item[this.localField])
      .filter(Boolean);
    
    if (ids.length === 0) return;
    
    // Fetch related data
    const relatedData = await adapter.find(this.targetTable, {
      filter: { [this.foreignField]: { $in: ids } }
    });
    
    // Map related data back to original data
    const relatedMap = new Map();
    for (const item of relatedData) {
      const key = item[this.foreignField];
      if (!relatedMap.has(key)) {
        relatedMap.set(key, []);
      }
      relatedMap.get(key).push(item);
    }
    
    // Populate the data
    for (const item of data) {
      const related = relatedMap.get(item[this.localField]);
      if (related) {
        item[this.name] = this.isMultiResult() ? related : related[0];
      }
    }
  }

  /**
   * Get join hint from embed request
   */
  protected getJoinType(
    embedRequest: EmbedRequest
  ): "inner" | "left" | "right" {
    switch (embedRequest.joinHint) {
      case "inner":
        return "inner";
      case "right":
        return "right";
      case "left":
      default:
        return "left";
    }
  }

  /**
   * Generate base lookup pipeline stages
   */
  protected generateBasePipeline(embedRequest: EmbedRequest): any[] {
    const pipeline: any[] = [];

    // Add match stage for filters
    if (embedRequest.filters && Object.keys(embedRequest.filters).length > 0) {
      pipeline.push({ $match: embedRequest.filters });
    }

    // Add sort stage
    if (embedRequest.orderBy && embedRequest.orderBy.length > 0) {
      const sort = this.parseOrderBy(embedRequest.orderBy);
      pipeline.push({ $sort: sort });
    }

    // Add skip stage
    if (embedRequest.offset && embedRequest.offset > 0) {
      pipeline.push({ $skip: embedRequest.offset });
    }

    // Add limit stage
    if (embedRequest.limit && embedRequest.limit > 0) {
      pipeline.push({ $limit: embedRequest.limit });
    }

    // ✅ Fix: Only add projection if fields array has items
    if (embedRequest.fields && embedRequest.fields.length > 0) {
      const projection: Record<string, 1> = {};
      embedRequest.fields.forEach((field) => {
        projection[field] = 1;
      });
    }

    return pipeline;
  }

  /**
   * Parse orderBy array to MongoDB sort object
   */
  private parseOrderBy(orderBy: string[]): Record<string, 1 | -1> {
    const sort: Record<string, 1 | -1> = {};
    orderBy.forEach((order) => {
      const [field, direction] = order.split(".");
      sort[field] = direction === "desc" ? -1 : 1;
    });
    return sort;
  }
}
