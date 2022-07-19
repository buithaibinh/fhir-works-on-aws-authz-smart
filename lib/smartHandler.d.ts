import { Authorization, VerifyAccessTokenRequest, AuthorizationBundleRequest, AllowedResourceTypesForOperationRequest, ReadResponseAuthorizedRequest, WriteRequestAuthorizedRequest, AccessBulkDataJobRequest, FhirVersion, GetSearchFilterBasedOnIdentityRequest, SearchFilter } from 'fhir-works-on-aws-interface';
import { SMARTConfig, UserIdentity } from './smartConfig';
export declare class SMARTHandler implements Authorization {
    /**
     * If a fhirUser is of these resourceTypes they will be able to READ & WRITE without having to meet the reference criteria
     */
    private readonly adminAccessTypes;
    /**
     * If a fhirUser is of these resourceTypes they will be able to do bulk data operations
     */
    private readonly bulkDataAccessTypes;
    private readonly version;
    private readonly config;
    private readonly apiUrl;
    private readonly fhirVersion;
    private readonly isUserScopeAllowedForSystemExport;
    private readonly jwksClient?;
    /**
     * @param apiUrl URL of this FHIR service. Will be used to determine if a requestor is from this FHIR server or not
     * when the request does not include a fhirServiceBaseUrl
     * @param adminAccessTypes a fhirUser from these resourceTypes they will be able to READ & WRITE without having to meet the reference criteria
     * @param bulkDataAccessTypes a fhirUser from these resourceTypes they will be able to do bulk data operations
     */
    constructor(config: SMARTConfig, apiUrl: string, fhirVersion: FhirVersion, adminAccessTypes?: string[], bulkDataAccessTypes?: string[], isUserScopeAllowedForSystemExport?: boolean);
    verifyAccessToken(request: VerifyAccessTokenRequest): Promise<UserIdentity>;
    isAccessBulkDataJobAllowed(request: AccessBulkDataJobRequest): Promise<void>;
    getSearchFilterBasedOnIdentity(request: GetSearchFilterBasedOnIdentityRequest): Promise<SearchFilter[]>;
    isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<void>;
    getAllowedResourceTypesForOperation(request: AllowedResourceTypesForOperationRequest): Promise<string[]>;
    authorizeAndFilterReadResponse(request: ReadResponseAuthorizedRequest): Promise<any>;
    isWriteRequestAuthorized(request: WriteRequestAuthorizedRequest): Promise<void>;
}
