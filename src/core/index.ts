export interface QueryParams {
  [key: string]: string | string[];
}

export interface ParsedFilter {
  field: string;
  operator: string;
  value: any;
  modifier?: string;
}

export interface MongoQuery {
  filter: Record<string, any>;
  projection?: Record<string, 1 | 0>;
  sort?: Record<string, 1 | -1>;
  pipeline?: any[];
  hasEmbeds?: boolean;
  embeddedTables?: string[];
  limit?: number;
  skip?: number;
  count?: boolean;
}

export interface ConvertOptions {
  collection?: string; // Required for embeds to work
  enableEmbeds?: boolean;
  maxEmbedDepth?: number;
}
