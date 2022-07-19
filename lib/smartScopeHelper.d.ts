import { BulkDataAuth, SystemOperation, TypeOperation } from 'fhir-works-on-aws-interface';
import { AccessModifier, ClinicalSmartScope, ScopeRule, ScopeType } from './smartConfig';
export declare const SEARCH_OPERATIONS: (TypeOperation | SystemOperation)[];
export declare const FHIR_SCOPE_REGEX: RegExp;
export declare function convertScopeToSmartScope(scope: string): ClinicalSmartScope;
export declare function getValidOperationsForScopeTypeAndAccessType(scopeType: ScopeType, accessType: AccessModifier, scopeRule: ScopeRule): (TypeOperation | SystemOperation)[];
export declare function getScopes(scopes: string | string[]): string[];
export declare function isScopeSufficient(scope: string, scopeRule: ScopeRule, reqOperation: TypeOperation | SystemOperation, isUserScopeAllowedForSystemExport: boolean, reqResourceType?: string, bulkDataAuth?: BulkDataAuth): boolean;
/**
 * Remove scopes that do not have the required information to be useful or unused scopes. For example:
 * - Without the `fhirUser` claim the 'user' scopes cannot be validated
 * - Without the `launch_response_patient` claim the 'patient' scopes cannot be validated
 * - Scopes like profile, launch or fhirUser will be filtered out as well
 */
export declare function filterOutUnusableScope(scopes: string[], scopeRule: ScopeRule, reqOperation: TypeOperation | SystemOperation, isUserScopeAllowedForSystemExport: boolean, reqResourceType?: string, bulkDataAuth?: BulkDataAuth, patientContext?: string, fhirUser?: string): string[];
