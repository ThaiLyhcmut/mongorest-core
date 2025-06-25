import {
    RbacJson,
    RbacCollection,
    RbacRolePattern,
    RbacPattern
} from './rbac-interface'
import * as fs from 'fs';
import * as path from 'path';
import { RbacErrors } from '../errors/errorFactories';


export class RbacValidator {
    private rbacJson: RbacJson;

    constructor() {
        this.rbacJson = this.loadConfig();
    }

    public loadConfig(): RbacJson {
        const filePath = path.join(__dirname, '../../schemas/rbac/mongorestrbacjson.json');
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    }

    public updateConfig(config: RbacJson) {
        this.rbacJson = config;
    }

    private hasUserRole(role: RbacRolePattern[], userRoles: string): boolean {
        return role.some(r => r.user_role === userRoles);
    }

    public hasAccess(collection: string, action: string, userRoles: string[]): boolean {
        const rbacCollection: RbacCollection | undefined = this.rbacJson.collections.find((col: RbacCollection) => col.collection_name === collection);

        if (!rbacCollection) {
            return false; // Collection not found
        }

        const collectionAction: RbacRolePattern[] = action === 'read' ? rbacCollection.rbac_config.read : action === 'write' ? rbacCollection.rbac_config.write : rbacCollection.rbac_config.delete;

        return userRoles.some(role =>
            this.hasUserRole(collectionAction, role)
        );
    }

    // New methods for v2.0 compatibility
    public async applyRbac(query: any, user: any): Promise<any> {
        // Simple implementation - just return the query for now
        // In a full implementation, this would modify the query based on RBAC rules
        return query;
    }

    public async canCreate(collection: string, user: any): Promise<boolean> {
        if (!user || !user.roles) return false;
        return this.hasAccess(collection, 'write', user.roles);
    }

    public async canUpdate(collection: string, id: any, user: any): Promise<boolean> {
        if (!user || !user.roles) return false;
        return this.hasAccess(collection, 'write', user.roles);
    }

    public async canDelete(collection: string, id: any, user: any): Promise<boolean> {
        if (!user || !user.roles) return false;
        return this.hasAccess(collection, 'delete', user.roles);
    }

    public getRbacFeatures(collection: string, action: string, userRoles: string[], isRelate: boolean = false, layer: number = 1, pre_fieldName?: string): string[] {

        if (layer > 2) {
            return [];
        }

        const rbacCollection: RbacCollection = this.rbacJson.collections.find((col: RbacCollection) => col.collection_name === collection)!;

        if (!rbacCollection) {
            throw RbacErrors.collectionNotFound(collection);
        }

        const collectionAction: RbacRolePattern[] = action === 'read' ? rbacCollection.rbac_config.read : action === 'write' ? rbacCollection.rbac_config.write : rbacCollection.rbac_config.delete;

        let features: Set<string> = new Set<string>();

        userRoles.forEach(role => {
            if (this.hasUserRole(collectionAction, role)) {
                const rolePatterns: RbacPattern[] | undefined = collectionAction.find(r => r.user_role === role)?.patterns;
                if (!rolePatterns) {
                    console.warn(`No patterns found for role ${role} in collection ${collection} for action ${action}.`);
                }

                rolePatterns?.forEach(pattern => {
                    const fieldName = Object.keys(pattern)[0];

                    const typeValue = pattern[fieldName].type;

                    if (typeValue === 'field') {
                        features.add(isRelate ? (pre_fieldName + "." + fieldName) : fieldName);;
                    } else {
                        const relate_collection = pattern[fieldName].relate_collection;
                        const rbacFeatures = this.getRbacFeatures(
                            relate_collection,
                            action,
                            userRoles,
                            true,
                            layer + (collection === relate_collection ? 1 : 0),
                            pre_fieldName ? (pre_fieldName + "." + fieldName) : fieldName
                        );
                        rbacFeatures.length > 0 ? rbacFeatures.forEach((feature: string) => {
                            features.add(feature);
                        }) : {};
                    }
                });
            }
        });
        const data: string[] = Array.from(features).sort((a, b) => a.localeCompare(b));

        let pre_field: string = "";

        return data.map(feature => {
            if (pre_field === "") {
                pre_field = feature;
                return feature;
            }
            if (feature.startsWith(pre_field)) {
                return undefined;
            }
            else {
                pre_field = feature;
                return feature;
            }
        }).filter(feature => feature !== undefined && feature !== null);
    }

    public filterRbacFeatures(
        collection: string,
        action: string,
        userRoles: string[],
        features: string[]
    ): string[] {
        const rbacCollection: RbacCollection = this.rbacJson.collections.find((col: RbacCollection) => col.collection_name === collection)!;

        if (!rbacCollection) {
            throw RbacErrors.collectionNotFound(collection);
        }

        const collectionAction: RbacRolePattern[] = action === 'read' ? rbacCollection.rbac_config.read : action === 'write' ? rbacCollection.rbac_config.write : rbacCollection.rbac_config.delete;

        return features.filter(feature => {
            return userRoles.some(role => {
                return this.hasUserRole(collectionAction, role) &&
                    collectionAction.some(r => r.user_role === role && r.patterns.some(p => Object.keys(p)[0] === feature));
            });
        });
    }

    private objectize(features: string[]): Record<string, any> {
        const projection: Record<string, any> = {};

        for (const feature of features) {
            const parts = feature.split('.');
            let current = projection;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLast = i === parts.length - 1;

                if (isLast) {
                    current[part] = 1;
                } else {
                    if (!current[part] || current[part] === 1) {
                        current[part] = {};
                    }
                    current = current[part];
                }
            }
        }

        return projection;
    }

    private filterDataByProjection(data: any, projection: any): any {
        const result: any = {};

        for (const key in projection) {
            if (projection.hasOwnProperty(key)) {
                const projValue = projection[key];

                if (projValue === 1) {
                    // Field đơn giản
                    if (key in data) {
                        result[key] = data[key];
                    }
                } else if (typeof projValue === 'object' && projValue !== null) {
                    // Field lồng nhau
                    if (key in data && typeof data[key] === 'object' && data[key] !== null) {
                        result[key] = this.filterDataByProjection(data[key], projValue);
                    }
                }
            }
        }

        return result;
    }

    public filterBodyData(collection: string, action: string, roles: string[], data: any): any {
        if (!this.hasAccess(collection, action, roles)) {
            throw RbacErrors.accessDenied(action, collection, roles);
        }

        const rbacFeatures = this.objectize(this.getRbacFeatures(collection, action, roles));

        return this.filterDataByProjection(data, rbacFeatures);
    }
}