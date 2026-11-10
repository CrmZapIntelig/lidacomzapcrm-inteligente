/** Pure release proposal. No CLI execution, cloud discovery, credential loading or activation. */
export function privateOrdersReleasePlan() {
  return {
    schema: 1, mode: 'TEST', readyToDeploy: false,
    projectId: 'lidacomzapcrm-staging', channelId: 'private-orders', region: 'southamerica-east1',
    gates: ['STAGING_AUTH_WEB_APP_REQUIRED', 'VERIFIED_OPERATOR_UID_REQUIRED', 'SERVER_MEMBERSHIP_APPROVAL_REQUIRED',
      'SERVICE_ACCOUNT_PERMISSIONS_REVIEW_REQUIRED', 'PUBLIC_FUNCTION_INVOCATION_APPROVAL_REQUIRED', 'FUNCTION_COST_APPROVAL_REQUIRED',
      'DURABLE_TEST_WRITE_APPROVAL_REQUIRED', 'ONLINE_CSP_REWRITE_VALIDATION_REQUIRED'],
    functionCandidate: { entry: 'staging-functions/lib/testOrdersEndpoint.candidate.js', exportName: 'testOrdersApi',
      existingEntryMustRemain: 'staging-functions/lib/index.js', defaultRuntimeEnabled: false },
    hostingCandidate: {
      hosting: { site: 'lidacomzapcrm-staging', public: 'dist-private-orders',
        ignore: ['**/.*', '**/node_modules/**', 'isolation-report.json'],
        rewrites: [{ source: '/api/test/orders', function: { functionId: 'testOrdersApi', region: 'southamerica-east1', pinTag: false } }, { source: '**', destination: '/index.html' }],
        headers: [{ source: '**', headers: [
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' https://apis.google.com; style-src 'self'; img-src 'self' data:; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; frame-src 'self' https://lidacomzapcrm-staging.firebaseapp.com; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" },
          { key: 'Cache-Control', value: 'no-store' }, { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ] }],
      },
    },
    deploymentScope: 'Dedicated preview channel only; never the live channel or existing synthetic channels',
    rollback: {
      order: ['Disable server runtime configuration and redeploy only the reviewed testOrdersApi revision',
        'Publish the disabled private entry to the same dedicated preview channel',
        'Restore the recorded prior function revision and channel release only after checking compatibility'],
      preserve: ['Firestore TEST aggregates, receipts and audit', 'Existing synthetic Hosting releases/CSP', 'Operational project, credentials and main branch'],
      dataDeletion: false, automaticDowngrade: false,
    },
  } as const;
}
