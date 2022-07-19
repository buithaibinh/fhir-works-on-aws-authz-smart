import { FhirVersion } from 'fhir-works-on-aws-interface';
import { JwksClient, Headers } from 'jwks-rsa';
import { FhirResource, IntrospectionOptions } from './smartConfig';
export declare const FHIR_USER_REGEX: RegExp;
export declare const FHIR_RESOURCE_REGEX: RegExp;
export declare function getFhirUser(fhirUserValue: string): FhirResource;
export declare function getFhirResource(resourceValue: string, defaultHostname: string): FhirResource;
export declare function hasReferenceToResource(requestorId: FhirResource, sourceResource: any, apiUrl: string, fhirVersion: FhirVersion): boolean;
export declare function isFhirUserAdmin(fhirUser: FhirResource, adminAccessTypes: string[], apiUrl: string): boolean;
/**
 * @param usableScopes this should be usableScope set from the `verifyAccessToken` method
 * @param resourceType the type of the resource we are trying to access
 * @returns if there is a usable system scope for this request
 */
export declare function hasSystemAccess(usableScopes: string[], resourceType: string): boolean;
export declare function hasAccessToResource(fhirUserObject: FhirResource, patientLaunchContext: FhirResource, sourceResource: any, usableScopes: string[], adminAccessTypes: string[], apiUrl: string, fhirVersion: FhirVersion): boolean;
export declare function getJwksClient(jwksUri: string, headers?: Headers): JwksClient;
export declare function decodeJwtToken(token: string, expectedAudValue: string | RegExp, expectedIssValue: string): import("jsonwebtoken").Jwt;
export declare function verifyJwtToken(token: string, expectedAudValue: string | RegExp, expectedIssValue: string, client: JwksClient): Promise<string | import("jsonwebtoken").JwtPayload>;
export declare function introspectJwtToken(token: string, expectedAudValue: string | RegExp, expectedIssValue: string, introspectionOptions: IntrospectionOptions): Promise<import("jsonwebtoken").JwtPayload>;
