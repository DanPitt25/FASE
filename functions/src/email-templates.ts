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