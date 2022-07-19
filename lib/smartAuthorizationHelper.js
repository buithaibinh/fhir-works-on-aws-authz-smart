"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.introspectJwtToken = exports.verifyJwtToken = exports.decodeJwtToken = exports.getJwksClient = exports.hasAccessToResource = exports.hasSystemAccess = exports.isFhirUserAdmin = exports.hasReferenceToResource = exports.getFhirResource = exports.getFhirUser = exports.FHIR_RESOURCE_REGEX = exports.FHIR_USER_REGEX = void 0;
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
const fhir_works_on_aws_interface_1 = require("fhir-works-on-aws-interface");
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const jsonwebtoken_1 = require("jsonwebtoken");
const axios_1 = __importDefault(require("axios"));
const fhirResourceReferencesMatrix_v4_0_1_json_1 = __importDefault(require("./schema/fhirResourceReferencesMatrix.v4.0.1.json"));
const fhirResourceReferencesMatrix_v3_0_1_json_1 = __importDefault(require("./schema/fhirResourceReferencesMatrix.v3.0.1.json"));
const loggerBuilder_1 = __importDefault(require("./loggerBuilder"));
exports.FHIR_USER_REGEX = /^(?<hostname>(http|https):\/\/([A-Za-z0-9\-\\.:%$_/])+)\/(?<resourceType>Person|Practitioner|RelatedPerson|Patient)\/(?<id>[A-Za-z0-9\-.]+)$/;
exports.FHIR_RESOURCE_REGEX = /^((?<hostname>(http|https):\/\/([A-Za-z0-9\-\\.:%$_/])+)\/)?(?<resourceType>[A-Z][a-zA-Z]+)\/(?<id>[A-Za-z0-9\-.]+)$/;
const GENERIC_ERR_MESSAGE = 'Invalid access token';
function getFhirUser(fhirUserValue) {
    const match = fhirUserValue.match(exports.FHIR_USER_REGEX);
    if (match) {
        const { hostname, resourceType, id } = match.groups;
        return { hostname, resourceType, id };
    }
    throw new fhir_works_on_aws_interface_1.UnauthorizedError("Requester's identity is in the incorrect format");
}
exports.getFhirUser = getFhirUser;
function getFhirResource(resourceValue, defaultHostname) {
    var _a;
    const match = resourceValue.match(exports.FHIR_RESOURCE_REGEX);
    if (match) {
        const { resourceType, id } = match.groups;
        const hostname = (_a = match.groups.hostname) !== null && _a !== void 0 ? _a : defaultHostname;
        return { hostname, resourceType, id };
    }
    throw new fhir_works_on_aws_interface_1.UnauthorizedError('Resource is in the incorrect format');
}
exports.getFhirResource = getFhirResource;
const logger = (0, loggerBuilder_1.default)();
function isRequestorReferenced(requestorIds, requestorResourceType, sourceResource, fhirVersion) {
    const sourceResourceType = sourceResource.resourceType;
    let matrix;
    if (fhirVersion === '4.0.1') {
        matrix = fhirResourceReferencesMatrix_v4_0_1_json_1.default;
    }
    else if (fhirVersion === '3.0.1') {
        matrix = fhirResourceReferencesMatrix_v3_0_1_json_1.default;
    }
    else {
        throw new Error('Unsupported FHIR version detected');
    }
    let possiblePaths = [];
    if (matrix[sourceResourceType] && matrix[sourceResourceType][requestorResourceType]) {
        possiblePaths = matrix[sourceResourceType][requestorResourceType];
    }
    // The paths within the FHIR resources may contain arrays so we must check if array at every level
    return possiblePaths.some((path) => {
        const pathComponents = path.split('.');
        let tempResource = sourceResource;
        let rootQueue = [];
        let nextQueue = [tempResource[pathComponents[0]]];
        for (let i = 1; i < pathComponents.length; i += 1) {
            rootQueue = nextQueue;
            nextQueue = [];
            while (rootQueue.length > 0) {
                tempResource = rootQueue.shift();
                if (tempResource) {
                    if (Array.isArray(tempResource)) {
                        // eslint-disable-next-line no-loop-func
                        tempResource.forEach((x) => {
                            nextQueue.push(x[pathComponents[i]]);
                        });
                    }
                    else {
                        nextQueue.push(tempResource[pathComponents[i]]);
                    }
                }
            }
        }
        return nextQueue.flat().some((x) => {
            return x && x.reference && requestorIds.includes(x.reference);
        });
    });
}
function hasReferenceToResource(requestorId, sourceResource, apiUrl, fhirVersion) {
    const { hostname, resourceType, id } = requestorId;
    if (hostname !== apiUrl) {
        // If requester is not from this FHIR Server they must be a fully qualified reference
        return isRequestorReferenced([`${hostname}/${resourceType}/${id}`], resourceType, sourceResource, fhirVersion);
    }
    return ((resourceType === sourceResource.resourceType && id === sourceResource.id) ||
        isRequestorReferenced([`${resourceType}/${id}`, `${hostname}/${resourceType}/${id}`], resourceType, sourceResource, fhirVersion));
}
exports.hasReferenceToResource = hasReferenceToResource;
function isFhirUserAdmin(fhirUser, adminAccessTypes, apiUrl) {
    return apiUrl === fhirUser.hostname && adminAccessTypes.includes(fhirUser.resourceType);
}
exports.isFhirUserAdmin = isFhirUserAdmin;
/**
 * @param usableScopes this should be usableScope set from the `verifyAccessToken` method
 * @param resourceType the type of the resource we are trying to access
 * @returns if there is a usable system scope for this request
 */
function hasSystemAccess(usableScopes, resourceType) {
    return usableScopes.some((scope) => scope.startsWith('system/*') || scope.startsWith(`system/${resourceType}`));
}
exports.hasSystemAccess = hasSystemAccess;
function hasAccessToResource(fhirUserObject, patientLaunchContext, sourceResource, usableScopes, adminAccessTypes, apiUrl, fhirVersion) {
    return (hasSystemAccess(usableScopes, sourceResource.resourceType) ||
        (fhirUserObject &&
            (isFhirUserAdmin(fhirUserObject, adminAccessTypes, apiUrl) ||
                hasReferenceToResource(fhirUserObject, sourceResource, apiUrl, fhirVersion))) ||
        (patientLaunchContext && hasReferenceToResource(patientLaunchContext, sourceResource, apiUrl, fhirVersion)));
}
exports.hasAccessToResource = hasAccessToResource;
function getJwksClient(jwksUri, headers) {
    return (0, jwks_rsa_1.default)({
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 600000,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        requestHeaders: headers,
        jwksUri,
    });
}
exports.getJwksClient = getJwksClient;
function decodeJwtToken(token, expectedAudValue, expectedIssValue) {
    const decodedAccessToken = (0, jsonwebtoken_1.decode)(token, { complete: true });
    if (decodedAccessToken === null || typeof decodedAccessToken === 'string') {
        logger.warn('access_token could not be decoded into an object');
        throw new fhir_works_on_aws_interface_1.UnauthorizedError(GENERIC_ERR_MESSAGE);
    }
    const { aud, iss } = decodedAccessToken.payload;
    if (expectedIssValue !== iss) {
        logger.warn('access_token has unexpected `iss`');
        throw new fhir_works_on_aws_interface_1.UnauthorizedError(GENERIC_ERR_MESSAGE);
    }
    let audArray = [];
    if (aud) {
        if (typeof aud === 'string') {
            audArray = [aud];
        }
        else {
            audArray = aud;
        }
    }
    const audMatch = audArray.some((audience) => (typeof expectedAudValue === 'string' && expectedAudValue === audience) ||
        (expectedAudValue instanceof RegExp && expectedAudValue.test(audience)));
    if (!audMatch) {
        logger.warn('access_token has unexpected `aud`');
        throw new fhir_works_on_aws_interface_1.UnauthorizedError(GENERIC_ERR_MESSAGE);
    }
    return decodedAccessToken;
}
exports.decodeJwtToken = decodeJwtToken;
async function verifyJwtToken(token, expectedAudValue, expectedIssValue, client) {
    const decodedAccessToken = decodeJwtToken(token, expectedAudValue, expectedIssValue);
    const { kid } = decodedAccessToken.header;
    if (!kid) {
        logger.warn('JWT verification failed. JWT "kid" attribute is required in the header');
        throw new fhir_works_on_aws_interface_1.UnauthorizedError(GENERIC_ERR_MESSAGE);
    }
    try {
        const key = await client.getSigningKeyAsync(kid);
        return (0, jsonwebtoken_1.verify)(token, key.getPublicKey(), { audience: expectedAudValue, issuer: expectedIssValue });
    }
    catch (e) {
        logger.warn(e.message);
        throw new fhir_works_on_aws_interface_1.UnauthorizedError(GENERIC_ERR_MESSAGE);
    }
}
exports.verifyJwtToken = verifyJwtToken;
async function introspectJwtToken(token, expectedAudValue, expectedIssValue, introspectionOptions) {
    // used to verify if `iss` or `aud` is valid
    const decodedTokenPayload = decodeJwtToken(token, expectedAudValue, expectedIssValue).payload;
    const { introspectUrl, clientId, clientSecret } = introspectionOptions;
    // setup basic authentication
    const username = clientId;
    const password = clientSecret;
    const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    try {
        const response = await axios_1.default.post(introspectUrl, `token=${token}`, {
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                accept: 'application/json',
                authorization: auth,
                'cache-control': 'no-cache',
            },
        });
        if (!response.data.active) {
            throw new fhir_works_on_aws_interface_1.UnauthorizedError(GENERIC_ERR_MESSAGE);
        }
        return decodedTokenPayload;
    }
    catch (e) {
        if (axios_1.default.isAxiosError(e)) {
            if (e.response) {
                logger.warn(`Status received from introspection call: ${e.response.status}`);
                logger.warn(e.response.data);
            }
        }
        else {
            logger.warn(e.message);
        }
        throw new fhir_works_on_aws_interface_1.UnauthorizedError(GENERIC_ERR_MESSAGE);
    }
}
exports.introspectJwtToken = introspectJwtToken;
//# sourceMappingURL=smartAuthorizationHelper.js.map