// Node.js script to run the migration with Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin
// You'll need to get your service account key from Firebase Console
// Go to Project Settings > Service Accounts > Generate new private key
const serviceAccount = require('./firebase-service-account-key.json'); // You'll need to add this file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fase-site' 
});

const db = admin.firestore();

// Migration function
async function migrateData() {
  try {
    console.log('Starting data migration...');
    
    // Get all existing users
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    const users = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id }));
    
    // Get all existing member applications
    const membersRef = db.collection('members');
    const membersSnapshot = await membersRef.get();
    const memberApplications = membersSnapshot.docs.map(doc => doc.data());
    
    // Create a map of uid -> member application
    const memberMap = new Map();
    memberApplications.forEach(member => {
      memberMap.set(member.uid, member);
    });
    
    console.log(`Found ${users.length} users and ${memberApplications.length} member applications`);
    
    // Migrate each user
    for (const user of users) {
      const memberApplication = memberMap.get(user.uid);
      
      // Determine status for unified member
      let status = 'guest';
      if (user.access === 'admin') {
        status = 'admin';
      } else if (memberApplication) {
        switch (memberApplication.status) {
          case 'approved':
          case 'paid':
            status = 'approved';
            break;
          case 'pending':
          case 'invoice_sent':
            status = 'pending';
            break;
          default:
            status = 'guest';
        }
      }
      
      // Create unified member record
      const unifiedMember = {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        personalName: user.personalName,
        status,
        organisation: user.organisation,
        createdAt: user.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        
        // Copy over member application data if it exists
        ...(memberApplication && {
          membershipType: memberApplication.membershipType,
          organizationName: memberApplication.organizationName,
          organizationType: memberApplication.organizationType,
          logoURL: memberApplication.logoURL,
          privacyAgreed: memberApplication.privacyAgreed,
          dataProcessingAgreed: memberApplication.dataProcessingAgreed,
          primaryContact: memberApplication.primaryContact,
          organizationDetails: memberApplication.organizationDetails,
          regulatory: memberApplication.regulatory,
          registeredAddress: memberApplication.registeredAddress,
          seniorLeadership: memberApplication.seniorLeadership,
          keyContacts: memberApplication.keyContacts,
          invoicingAddress: memberApplication.invoicingAddress,
          invoicingContact: memberApplication.invoicingContact,
          distributionStrategy: memberApplication.distributionStrategy,
          technology: memberApplication.technology,
          portfolio: memberApplication.portfolio,
          productLines: memberApplication.productLines,
          claimsModel: memberApplication.claimsModel,
          generalInformation: memberApplication.generalInformation,
          demographics: memberApplication.demographics,
          termsAgreed: memberApplication.termsAgreed,
          hasOtherAssociations: memberApplication.hasOtherAssociations,
          otherAssociations: memberApplication.otherAssociations
        })
      };
      
      // Save to new collection
      await db.collection('accounts').doc(user.uid).set(unifiedMember);
      
      console.log(`✅ Migrated user ${user.email} with status ${status}`);
    }
    
    // Handle member applications without corresponding users
    for (const memberApplication of memberApplications) {
      if (!users.find(user => user.uid === memberApplication.uid)) {
        console.warn(`⚠️  Found member application without user: ${memberApplication.uid}`);
        // You might want to create a basic user record or handle this case differently
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log(`Migrated ${users.length} users to accounts collection`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateData()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });