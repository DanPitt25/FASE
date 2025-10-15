// Alternative: Firebase Function for migration
// Deploy this to Firebase Functions if you prefer

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

exports.migrateData = functions.https.onRequest(async (req, res) => {
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
    
    let migratedCount = 0;
    
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
      migratedCount++;
    }
    
    console.log('🎉 Migration completed successfully!');
    
    res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      migratedUsers: migratedCount,
      totalUsers: users.length
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// To deploy: firebase deploy --only functions:migrateData
// To run: POST https://your-region-your-project.cloudfunctions.net/migrateData