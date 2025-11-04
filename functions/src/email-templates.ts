// Email templates for different languages
export type Language = 'en' | 'fr';

interface EmailTemplates {
  verificationCode: {
    subject: string;
    html: (code: string) => string;
  };
  invoice: {
    subject: (invoiceNumber: string, totalAmount: string) => string;
    html: (invoiceNumber: string, organizationName: string, totalAmount: string) => string;
  };
  joinRequestApproved: {
    subject: (companyName: string) => string;
    html: (fullName: string, email: string, companyName: string, adminNotes?: string) => string;
  };
  joinRequestUpdate: {
    subject: (companyName: string) => string;
    html: (fullName: string, companyName: string, status: string, adminNotes?: string) => string;
  };
  passwordReset: {
    subject: string;
    html: (resetUrl: string) => string;
  };
  membershipAcceptance: {
    subject: (organizationName: string) => string;
    html: (fullName: string, organizationName: string, paypalUrl: string, invoiceUrl: string, totalAmount: string) => string;
  };
}

const templates: Record<Language, EmailTemplates> = {
  en: {
    verificationCode: {
      subject: 'Verify your FASE account',
      html: (code: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">Verify your FASE account</h2>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e3a8a;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire in 20 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    },
    invoice: {
      subject: (invoiceNumber: string, totalAmount: string) => `FASE Membership Invoice ${invoiceNumber} - €${totalAmount}`,
      html: (invoiceNumber: string, organizationName: string, totalAmount: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">FASE Membership Invoice</h2>
          <p>Dear ${organizationName} team,</p>
          <p>Please find attached your FASE membership invoice.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e3a8a; margin-top: 0;">Invoice Details:</h3>
            <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p><strong>Organization:</strong> ${organizationName}</p>
            <p><strong>Amount:</strong> €${totalAmount}</p>
          </div>
          
          <p>This invoice includes your annual FASE membership fee. Please transfer the amount to:</p>
          
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Bank:</strong> Citibank, N.A.</p>
            <p style="margin: 5px 0;"><strong>Account:</strong> Lexicon Associates, LLC (125582998)</p>
            <p style="margin: 5px 0;"><strong>ABA:</strong> 221172610 | <strong>SWIFT:</strong> CITIUS33</p>
            <p style="margin: 5px 0;"><strong>Reference:</strong> ${invoiceNumber}</p>
          </div>
          
          <p>If you have any questions about this invoice, please contact us at <a href="mailto:billing@fasemga.com">billing@fasemga.com</a></p>
          
          <p>Thank you for your membership!</p>
          <p><strong>Federation of European MGAs</strong></p>
        </div>
      `
    },
    joinRequestApproved: {
      subject: (companyName: string) => `FASE Join Request Approved - ${companyName}`,
      html: (fullName: string, email: string, companyName: string, adminNotes?: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">Your join request has been approved!</h2>
          <p>Dear ${fullName},</p>
          <p>Great news! Your request to join <strong>${companyName}</strong> has been approved by the company administrator.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e3a8a; margin-top: 0;">Next Steps:</h3>
            <p>You can now create your FASE account and access your organization's membership benefits:</p>
            <ol>
              <li>Visit <a href="https://fasemga.com/register" style="color: #1e3a8a;">fasemga.com/register</a></li>
              <li>Sign up with this email address (${email})</li>
              <li>Complete the registration process</li>
              <li>You'll automatically be associated with ${companyName}</li>
            </ol>
          </div>
          
          ${adminNotes ? `
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Message from Administrator:</strong>
            <p style="margin: 10px 0 0 0;">${adminNotes}</p>
          </div>
          ` : ''}
          
          <p>Welcome to the Federation of European MGAs!</p>
          <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact us at <a href="mailto:help@fasemga.com">help@fasemga.com</a></p>
        </div>
      `
    },
    joinRequestUpdate: {
      subject: (companyName: string) => `FASE Join Request Update - ${companyName}`,
      html: (fullName: string, companyName: string, status: string, adminNotes?: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">Join Request Update</h2>
          <p>Dear ${fullName},</p>
          <p>We have an update regarding your request to join <strong>${companyName}</strong>.</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Status:</strong> ${status === 'rejected' ? 'Not approved at this time' : status}</p>
            ${adminNotes ? `
            <p><strong>Message from Administrator:</strong></p>
            <p>${adminNotes}</p>
            ` : ''}
          </div>
          
          <p>If you have any questions about this decision, please contact the company administrator directly or reach out to us at <a href="mailto:support@fasemga.com">support@fasemga.com</a></p>
        </div>
      `
    },
    passwordReset: {
      subject: 'Reset your FASE password',
      html: (resetUrl: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">Reset your FASE password</h2>
          <p>You requested a password reset for your FASE account.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${resetUrl}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Or copy and paste this link in your browser:<br>
            <a href="${resetUrl}" style="color: #1e3a8a; word-break: break-all;">${resetUrl}</a></p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
          <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact us at <a href="mailto:help@fasemga.com">help@fasemga.com</a></p>
        </div>
      `
    },
    membershipAcceptance: {
      subject: (organizationName: string) => `🎉 Welcome to FASE! Membership Approved - ${organizationName}`,
      html: (fullName: string, organizationName: string, paypalUrl: string, invoiceUrl: string, totalAmount: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 40px; border-radius: 12px; border: 3px solid #2D5574; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2D5574; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
              <h2 style="color: #B46A33; margin: 10px 0; font-size: 22px;">Welcome to FASE</h2>
            </div>
            
            <p style="font-size: 18px; line-height: 1.6; color: #333;">
              Dear ${fullName},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Fantastic news! <strong>${organizationName}</strong> has been accepted as a member of the <strong>Federation of European MGAs (FASE)</strong>.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              We're thrilled to welcome you to our growing community of European managing general agents and industry professionals. Your membership opens doors to networking, collaboration, and professional development opportunities across Europe.
            </p>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 10px; margin: 30px 0; border-left: 5px solid #2D5574;">
              <h3 style="color: #2D5574; margin-top: 0; font-size: 18px;">🚀 Complete Your Membership</h3>
              <p style="margin: 0; color: #333; font-size: 16px;">
                To finalize your membership and gain full access to FASE benefits, please complete your payment of <strong>€${totalAmount}</strong>.
              </p>
            </div>
            
            <div style="margin: 30px 0;">
              <h3 style="color: #2D5574; margin-bottom: 20px; font-size: 18px;">Choose Your Payment Method:</h3>
              
              <div style="display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px; background: #fff; border: 2px solid #2D5574; border-radius: 8px; padding: 20px; text-align: center;">
                  <h4 style="color: #2D5574; margin-top: 0;">💳 Pay with PayPal</h4>
                  <p style="color: #666; font-size: 14px; margin: 10px 0;">Quick and secure payment</p>
                  <a href="${paypalUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Pay with PayPal</a>
                </div>
                
                <div style="flex: 1; min-width: 250px; background: #fff; border: 2px solid #B46A33; border-radius: 8px; padding: 20px; text-align: center;">
                  <h4 style="color: #B46A33; margin-top: 0;">🧾 Request Invoice</h4>
                  <p style="color: #666; font-size: 14px; margin: 10px 0;">Bank transfer payment</p>
                  <a href="${invoiceUrl}" style="background: #B46A33; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Get Invoice</a>
                </div>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #2D5574; margin-top: 0; font-size: 16px;">🌟 What's Next?</h3>
              <ul style="margin: 10px 0; color: #333; padding-left: 20px;">
                <li style="margin: 8px 0;">Access to our member-only networking events</li>
                <li style="margin: 8px 0;">Exclusive industry insights and market intelligence</li>
                <li style="margin: 8px 0;">Professional development opportunities</li>
                <li style="margin: 8px 0;">Directory listing to connect with peers</li>
                <li style="margin: 8px 0;">Advocacy and representation at European level</li>
              </ul>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Once your payment is processed, you'll receive full access to your member portal and all FASE resources.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Questions? We're here to help! Contact us at <a href="mailto:admin@fasemga.com" style="color: #2D5574; text-decoration: none;">admin@fasemga.com</a>
            </p>
            
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E7EB;">
              <p style="font-size: 18px; line-height: 1.6; margin-bottom: 10px; color: #333;">
                <strong>Welcome to the FASE family!</strong>
              </p>
              <p style="color: #666; font-size: 14px; margin: 0;">
                <strong>The FASE Team</strong><br>
                Federation of European MGAs
              </p>
            </div>
          </div>
        </div>
      `
    }
  },
  fr: {
    verificationCode: {
      subject: 'Vérifiez votre compte FASE',
      html: (code: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">Vérifiez votre compte FASE</h2>
          <p>Votre code de vérification est :</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e3a8a;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Ce code expirera dans 20 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">Si vous n'avez pas demandé ce code, veuillez ignorer cet e-mail.</p>
        </div>
      `
    },
    invoice: {
      subject: (invoiceNumber: string, totalAmount: string) => `Facture d'adhésion FASE ${invoiceNumber} - €${totalAmount}`,
      html: (invoiceNumber: string, organizationName: string, totalAmount: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">Facture d'adhésion FASE</h2>
          <p>Chère équipe ${organizationName},</p>
          <p>Veuillez trouver ci-joint votre facture d'adhésion FASE.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e3a8a; margin-top: 0;">Détails de la facture :</h3>
            <p><strong>Numéro de facture :</strong> ${invoiceNumber}</p>
            <p><strong>Organisation :</strong> ${organizationName}</p>
            <p><strong>Montant :</strong> €${totalAmount}</p>
          </div>
          
          <p>Cette facture comprend votre cotisation annuelle d'adhésion FASE. Veuillez virer le montant à :</p>
          
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Banque :</strong> Citibank, N.A.</p>
            <p style="margin: 5px 0;"><strong>Compte :</strong> Lexicon Associates, LLC (125582998)</p>
            <p style="margin: 5px 0;"><strong>ABA :</strong> 221172610 | <strong>SWIFT :</strong> CITIUS33</p>
            <p style="margin: 5px 0;"><strong>Référence :</strong> ${invoiceNumber}</p>
          </div>
          
          <p>Si vous avez des questions concernant cette facture, veuillez nous contacter à <a href="mailto:billing@fasemga.com">billing@fasemga.com</a></p>
          
          <p>Merci pour votre adhésion !</p>
          <p><strong>Fédération des Agences de Souscription Européennes</strong></p>
        </div>
      `
    },
    joinRequestApproved: {
      subject: (companyName: string) => `Demande d'adhésion FASE approuvée - ${companyName}`,
      html: (fullName: string, email: string, companyName: string, adminNotes?: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">Votre demande d'adhésion a été approuvée !</h2>
          <p>Cher/Chère ${fullName},</p>
          <p>Excellente nouvelle ! Votre demande d'adhésion à <strong>${companyName}</strong> a été approuvée par l'administrateur de l'entreprise.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e3a8a; margin-top: 0;">Prochaines étapes :</h3>
            <p>Vous pouvez maintenant créer votre compte FASE et accéder aux avantages d'adhésion de votre organisation :</p>
            <ol>
              <li>Visitez <a href="https://fasemga.com/register" style="color: #1e3a8a;">fasemga.com/register</a></li>
              <li>Inscrivez-vous avec cette adresse e-mail (${email})</li>
              <li>Complétez le processus d'inscription</li>
              <li>Vous serez automatiquement associé à ${companyName}</li>
            </ol>
          </div>
          
          ${adminNotes ? `
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Message de l'administrateur :</strong>
            <p style="margin: 10px 0 0 0;">${adminNotes}</p>
          </div>
          ` : ''}
          
          <p>Bienvenue dans la Fédération des Agences de Souscription Européennes !</p>
          <p style="color: #6b7280; font-size: 14px;">Si vous avez des questions, veuillez nous contacter à <a href="mailto:help@fasemga.com">help@fasemga.com</a></p>
        </div>
      `
    },
    joinRequestUpdate: {
      subject: (companyName: string) => `Mise à jour de la demande d'adhésion FASE - ${companyName}`,
      html: (fullName: string, companyName: string, status: string, adminNotes?: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">Mise à jour de la demande d'adhésion</h2>
          <p>Cher/Chère ${fullName},</p>
          <p>Nous avons une mise à jour concernant votre demande d'adhésion à <strong>${companyName}</strong>.</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Statut :</strong> ${status === 'rejected' ? 'Non approuvé pour le moment' : status}</p>
            ${adminNotes ? `
            <p><strong>Message de l'administrateur :</strong></p>
            <p>${adminNotes}</p>
            ` : ''}
          </div>
          
          <p>Si vous avez des questions sur cette décision, veuillez contacter directement l'administrateur de l'entreprise ou nous contacter à <a href="mailto:support@fasemga.com">support@fasemga.com</a></p>
        </div>
      `
    },
    passwordReset: {
      subject: 'Réinitialisez votre mot de passe FASE',
      html: (resetUrl: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">Réinitialisez votre mot de passe FASE</h2>
          <p>Vous avez demandé une réinitialisation de mot de passe pour votre compte FASE.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${resetUrl}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Réinitialiser le mot de passe</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Ou copiez et collez ce lien dans votre navigateur :<br>
            <a href="${resetUrl}" style="color: #1e3a8a; word-break: break-all;">${resetUrl}</a></p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Ce lien expirera dans 1 heure.</p>
          <p style="color: #6b7280; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation de mot de passe, veuillez ignorer cet e-mail.</p>
          <p style="color: #6b7280; font-size: 14px;">Si vous avez des questions, veuillez nous contacter à <a href="mailto:help@fasemga.com">help@fasemga.com</a></p>
        </div>
      `
    },
    membershipAcceptance: {
      subject: (organizationName: string) => `🎉 Bienvenue à FASE ! Adhésion Approuvée - ${organizationName}`,
      html: (fullName: string, organizationName: string, paypalUrl: string, invoiceUrl: string, totalAmount: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 40px; border-radius: 12px; border: 3px solid #2D5574; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2D5574; margin: 0; font-size: 28px;">🎉 Félicitations !</h1>
              <h2 style="color: #B46A33; margin: 10px 0; font-size: 22px;">Bienvenue à FASE</h2>
            </div>
            
            <p style="font-size: 18px; line-height: 1.6; color: #333;">
              Cher/Chère ${fullName},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Excellente nouvelle ! <strong>${organizationName}</strong> a été acceptée comme membre de la <strong>Fédération des Agences de Souscription Européennes (FASE)</strong>.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Nous sommes ravis de vous accueillir dans notre communauté grandissante d'agences générales de souscription européennes et de professionnels du secteur. Votre adhésion ouvre les portes au networking, à la collaboration et aux opportunités de développement professionnel à travers l'Europe.
            </p>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 10px; margin: 30px 0; border-left: 5px solid #2D5574;">
              <h3 style="color: #2D5574; margin-top: 0; font-size: 18px;">🚀 Finalisez Votre Adhésion</h3>
              <p style="margin: 0; color: #333; font-size: 16px;">
                Pour finaliser votre adhésion et obtenir un accès complet aux avantages FASE, veuillez compléter votre paiement de <strong>€${totalAmount}</strong>.
              </p>
            </div>
            
            <div style="margin: 30px 0;">
              <h3 style="color: #2D5574; margin-bottom: 20px; font-size: 18px;">Choisissez Votre Mode de Paiement :</h3>
              
              <div style="display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px; background: #fff; border: 2px solid #2D5574; border-radius: 8px; padding: 20px; text-align: center;">
                  <h4 style="color: #2D5574; margin-top: 0;">💳 Payer avec PayPal</h4>
                  <p style="color: #666; font-size: 14px; margin: 10px 0;">Paiement rapide et sécurisé</p>
                  <a href="${paypalUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Payer avec PayPal</a>
                </div>
                
                <div style="flex: 1; min-width: 250px; background: #fff; border: 2px solid #B46A33; border-radius: 8px; padding: 20px; text-align: center;">
                  <h4 style="color: #B46A33; margin-top: 0;">🧾 Demander une Facture</h4>
                  <p style="color: #666; font-size: 14px; margin: 10px 0;">Paiement par virement bancaire</p>
                  <a href="${invoiceUrl}" style="background: #B46A33; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Obtenir une Facture</a>
                </div>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #2D5574; margin-top: 0; font-size: 16px;">🌟 Et Maintenant ?</h3>
              <ul style="margin: 10px 0; color: #333; padding-left: 20px;">
                <li style="margin: 8px 0;">Accès aux événements de networking réservés aux membres</li>
                <li style="margin: 8px 0;">Insights exclusifs du secteur et intelligence de marché</li>
                <li style="margin: 8px 0;">Opportunités de développement professionnel</li>
                <li style="margin: 8px 0;">Annuaire pour se connecter avec des pairs</li>
                <li style="margin: 8px 0;">Advocacy et représentation au niveau européen</li>
              </ul>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Une fois votre paiement traité, vous recevrez un accès complet à votre portail membre et à toutes les ressources FASE.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Des questions ? Nous sommes là pour vous aider ! Contactez-nous à <a href="mailto:admin@fasemga.com" style="color: #2D5574; text-decoration: none;">admin@fasemga.com</a>
            </p>
            
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E7EB;">
              <p style="font-size: 18px; line-height: 1.6; margin-bottom: 10px; color: #333;">
                <strong>Bienvenue dans la famille FASE !</strong>
              </p>
              <p style="color: #666; font-size: 14px; margin: 0;">
                <strong>L'équipe FASE</strong><br>
                Fédération des Agences de Souscription Européennes
              </p>
            </div>
          </div>
        </div>
      `
    }
  }
};

// Language detection function
export function detectUserLanguage(email?: string, userAgent?: string, acceptLanguage?: string): Language {
  // Priority order:
  // 1. User's saved preference (would need to be passed in)
  // 2. Accept-Language header
  // 3. Default to English
  
  if (acceptLanguage) {
    const languages = acceptLanguage.toLowerCase().split(',');
    for (const lang of languages) {
      const langCode = lang.split(';')[0].trim();
      if (langCode.startsWith('fr')) {
        return 'fr';
      }
    }
  }
  
  return 'en'; // Default to English
}

// Main template getter function
export function getEmailTemplate(
  type: keyof EmailTemplates,
  language: Language = 'en'
): EmailTemplates[keyof EmailTemplates] {
  return templates[language][type];
}