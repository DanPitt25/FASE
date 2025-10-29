export const getGCPCredentials = () => {
  // for Vercel, use environment variables
  return process.env.GCP_PRIVATE_KEY
    ? {
        credentials: {
          type: "service_account",
          project_id: process.env.GCP_PROJECT_ID,
          client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY,
          private_key_id: "", // Not required by Firebase Admin
          client_id: "", // Not required by Firebase Admin
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GCP_SERVICE_ACCOUNT_EMAIL || "")}`,
        } as any,
        projectId: process.env.GCP_PROJECT_ID,
      }
    // for local development, use gcloud CLI
    : {};
};