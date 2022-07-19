"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterOutUnusableScope = exports.isScopeSufficient = exports.getScopes = exports.getValidOperationsForScopeTypeAndAccessType = exports.convertScopeToSmartScope = exports.FHIR_SCOPE_REGEX = exports.SEARCH_OPERATIONS = void 0;
exports.SEARCH_OPERATIONS = [
    'search-type',
    'search-system',
    'history-type',
    'history-instance',
    'history-system',
];
exports.FHIR_SCOPE_REGEX = /^(?<scopeType>patient|user|system)\/(?<scopeResourceType>[A-Z][a-zA-Z]+|\*)\.(?<accessType>read|write|\*)$/;
function convertScopeToSmartScope(scope) {
    const matchClinicalScope = scope.match(exports.FHIR_SCOPE_REGEX);
    if (matchClinicalScope) {
        const { scopeType, scopeResourceType, accessType } = matchClinicalScope.groups;
        return {
            scopeType: scopeType,
            resourceType: scopeResourceType,
            accessType: accessType,
        };
    }
    throw new Error('Not a SmartScope');
}
exports.convertScopeToSmartScope = convertScopeToSmartScope;
function getValidOperationsForScopeTypeAndAccessType(scopeType, accessType, scopeRule) {
    let validOperations = [];
    if (accessType === '*' || accessType === 'read') {
        validOperations = scopeRule[scopeType].read;
    }
    if (accessType === '*' || accessType === 'write') {
        validOperations = validOperations.concat(scopeRule[scopeType].write);
    }
    return validOperations;
}
exports.getValidOperationsForScopeTypeAndAccessType = getValidOperationsForScopeTypeAndAccessType;
function getValidOperationsForScope(smartScope, scopeRule, reqOperation, reqResourceType) {
    let validOperations = [];
    const { scopeType, resourceType, accessType } = smartScope;
    if (reqResourceType) {
        if (resourceType === '*' || resourceType === reqResourceType || reqOperation === 'search-type') {
            validOperations = getValidOperationsForScopeTypeAndAccessType(scopeType, accessType, scopeRule);
        }
    }
    // 'search-system' and 'history-system' request operation requires '*' for scopeResourceType
    else if ((['search-system', 'history-system'].includes(reqOperation) && resourceType === '*') ||
        ['transaction', 'batch'].includes(reqOperation)) {
        validOperations = getValidOperationsForScopeTypeAndAccessType(scopeType, accessType, scopeRule);
    }
    return validOperations;
}
function getScopes(scopes) {
    if (Array.isArray(scopes)) {
        return scopes;
    }
    if (typeof scopes === 'string') {
        return scopes.split(' ');
    }
    return [];
}
exports.getScopes = getScopes;
function isSmartScopeSufficientForBulkDataAccess(bulkDataAuth, smartScope, scopeRule, isUserScopeAllowedForSystemExport) {
    const { scopeType, accessType, resourceType } = smartScope;
    const hasReadPermissions = getValidOperationsForScopeTypeAndAccessType(scopeType, accessType, scopeRule).includes('read');
    const hasSufficientScopeType = isUserScopeAllowedForSystemExport
        ? ['system', 'user'].includes(scopeType)
        : ['system'].includes(scopeType);
    if (bulkDataAuth.operation === 'initiate-export') {
        let bulkDataRequestHasCorrectScope = false;
        if (bulkDataAuth.exportType === 'system') {
            bulkDataRequestHasCorrectScope = hasSufficientScopeType && resourceType === '*' && hasReadPermissions;
        }
        else if (bulkDataAuth.exportType === 'group') {
            bulkDataRequestHasCorrectScope = ['system'].includes(scopeType) && hasReadPermissions;
        }
        return bulkDataRequestHasCorrectScope;
    }
    return (['get-status-export', 'cancel-export'].includes(bulkDataAuth.operation) &&
        hasSufficientScopeType &&
        hasReadPermissions);
}
function isScopeSufficient(scope, scopeRule, reqOperation, isUserScopeAllowedForSystemExport, reqResourceType, bulkDataAuth) {
    try {
        console.log('isScopeSufficient', scope, reqOperation, reqResourceType, bulkDataAuth);
        const smartScope = convertScopeToSmartScope(scope);
        console.log('isScopeSufficient', smartScope);
        if (bulkDataAuth) {
            return isSmartScopeSufficientForBulkDataAccess(bulkDataAuth, smartScope, scopeRule, isUserScopeAllowedForSystemExport);
        }
        const validOperations = getValidOperationsForScope(smartScope, scopeRule, reqOperation, reqResourceType);
        return validOperations.includes(reqOperation);
    }
    catch (e) {
        // Caused by trying to convert non-SmartScope to SmartScope, for example converting non-SMART scope 'openid'
    }
    return false;
}
exports.isScopeSufficient = isScopeSufficient;
/**
 * Remove scopes that do not have the required information to be useful or unused scopes. For example:
 * - Without the `fhirUser` claim the 'user' scopes cannot be validated
 * - Without the `launch_response_patient` claim the 'patient' scopes cannot be validated
 * - Scopes like profile, launch or fhirUser will be filtered out as well
 */
function filterOutUnusableScope(scopes, scopeRule, reqOperation, isUserScopeAllowedForSystemExport, reqResourceType, bulkDataAuth, patientContext, fhirUser) {
    return scopes.filter((scope) => ((patientContext && scope.startsWith('patient/')) ||
        (fhirUser && scope.startsWith('user/')) ||
        scope.startsWith('system/')) &&
        isScopeSufficient(scope, scopeRule, reqOperation, isUserScopeAllowedForSystemExport, reqResourceType, bulkDataAuth));
}
exports.filterOutUnusableScope = filterOutUnusableScope;
//# sourceMappingURL=smartScopeHelper.js.map