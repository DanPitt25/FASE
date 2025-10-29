export const getGCPCredentials = () => {
  // for Vercel, use environment variables
  return process.env.GCP_PRIVATE_KEY
    ? {
        credentials: {
          project_id: process.env.GCP_PROJECT_ID,
          client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY,
        } as any,
        projectId: process.env.GCP_PROJECT_ID,
      }
    // for local development, use gcloud CLI
    : {};
};