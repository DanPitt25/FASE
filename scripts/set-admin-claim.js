const admin = require('firebase-admin');

// Initialize admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fase-site'
});

async function setAdminClaim() {
  try {
    const uid = '4sjA4EQ1wgfI0Sp8ij19kEGErEp2';
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log('Successfully set admin claim for user:', uid);
    
    // Verify it was set
    const user = await admin.auth().getUser(uid);
    console.log('User custom claims:', user.customClaims);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setAdminClaim();