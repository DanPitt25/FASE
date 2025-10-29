import { ServiceAccount } from 'firebase-admin';

export const getGCPCredentials = (): { credentials?: ServiceAccount; projectId?: string } => {
  // for Vercel, use environment variables
  return process.env.GCP_PRIVATE_KEY && process.env.GCP_SERVICE_ACCOUNT_EMAIL
    ? {
        credentials: {
          type: "service_account",
          project_id: process.env.GCP_PROJECT_ID || "",
          private_key_id: process.env.GCP_PRIVATE_KEY_ID || "",
          private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
          client_id: process.env.GCP_CLIENT_ID || "",
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GCP_SERVICE_ACCOUNT_EMAIL || "")}`,
        } as ServiceAccount,
        projectId: process.env.GCP_PROJECT_ID,
      }
    // for local development, use gcloud CLI
    : {};
};