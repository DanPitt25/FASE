const admin = require('firebase-admin');

// Initialize admin SDK with default credentials
admin.initializeApp({
  projectId: 'fase-site'
});

async function checkClaims() {
  try {
    const uid = '4sjA4EQ1wgfI0Sp8ij19kEGErEp2';
    const user = await admin.auth().getUser(uid);
    
    console.log('User email:', user.email);
    console.log('Current custom claims:', user.customClaims);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkClaims();