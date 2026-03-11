// ============================================================
// CONFIGURATION — replace placeholders before deploying
// ============================================================
const CONFIG = {
  aad: {
    tenantId:        'YOUR_TENANT_ID',
    clientId:        'YOUR_CLIENT_ID',
    redirectUri:     window.location.origin,
    securityGroupId: 'YOUR_SECURITY_GROUP_OBJECT_ID',
  },
  bc: {
    baseUrl:     'https://api.businesscentral.dynamics.com/v2.0/YOUR_TENANT_ID/Production/api',
    companyId:   'YOUR_BC_COMPANY_GUID',
    apiVersion:  'v2.0',
    customGroup: 'belam/portal/v1.0',  // matches APIPublisher/APIGroup/APIVersion in AL
  }
};
