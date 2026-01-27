'use client';

import { useState } from 'react';
import Button from '../../../components/Button';

interface BulletinTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (subject: string, body: string) => void;
}

type Language = 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl';

const bulletinTemplates: Record<Language, { subject: string; body: string }> = {
  en: {
    subject: 'Call for Content: The Entrepreneurial Underwriter',
    body: `Dear [Name],

We'll shortly be issuing the first edition of The Entrepreneurial Underwriter, FASE's monthly member bulletin, and we'd like to include any items that may be relevant to our members from your organization.

This bulletin will highlight news, achievements, and significant developments from our member community. If you have any of the following you'd like to share, please send them our way:

• Company announcements or milestones
• New appointments or team updates
• Product launches or partnerships
• Industry insights or thought leadership
• Upcoming events or webinars

Please send details to admin@fasemga.com by Tuesday, 28 January for inclusion in next week's edition.

The Entrepreneurial Underwriter will be distributed to all FASE members and posted on our member portal.`
  },
  fr: {
    subject: 'Appel à contributions : The Entrepreneurial Underwriter',
    body: `Cher/Chère [Nom],

Nous publierons prochainement la première édition de The Entrepreneurial Underwriter, le bulletin mensuel des membres de FASE, et nous aimerions y inclure toute information pertinente pour nos membres provenant de votre organisation.

Ce bulletin mettra en avant les actualités, les réalisations et les développements significatifs de notre communauté de membres. Si vous avez l'un des éléments suivants à partager, n'hésitez pas à nous les envoyer :

• Annonces ou étapes importantes de l'entreprise
• Nouvelles nominations ou évolutions d'équipe
• Lancements de produits ou partenariats
• Analyses sectorielles ou leadership éclairé
• Événements ou webinaires à venir

Veuillez envoyer les détails à admin@fasemga.com avant le mardi 28 janvier pour inclusion dans l'édition de la semaine prochaine.

The Entrepreneurial Underwriter sera distribué à tous les membres de FASE et publié sur notre portail membres.`
  },
  de: {
    subject: 'Aufruf zur Einreichung: The Entrepreneurial Underwriter',
    body: `Sehr geehrte/r [Name],

Wir werden in Kürze die erste Ausgabe von The Entrepreneurial Underwriter, dem monatlichen Mitglieder-Newsletter von FASE, veröffentlichen und möchten gerne relevante Beiträge Ihrer Organisation für unsere Mitglieder aufnehmen.

Dieser Newsletter wird Neuigkeiten, Erfolge und bedeutende Entwicklungen aus unserer Mitgliedergemeinschaft hervorheben. Wenn Sie eines der folgenden Themen teilen möchten, senden Sie uns diese bitte zu:

• Unternehmensankündigungen oder Meilensteine
• Neue Ernennungen oder Team-Updates
• Produkteinführungen oder Partnerschaften
• Brancheneinblicke oder Thought Leadership
• Kommende Veranstaltungen oder Webinare

Bitte senden Sie die Details bis Dienstag, 28. Januar an admin@fasemga.com, damit sie in die Ausgabe der nächsten Woche aufgenommen werden können.

The Entrepreneurial Underwriter wird an alle FASE-Mitglieder verteilt und auf unserem Mitgliederportal veröffentlicht.`
  },
  es: {
    subject: 'Convocatoria de contenidos: The Entrepreneurial Underwriter',
    body: `Estimado/a [Nombre],

Próximamente publicaremos la primera edición de The Entrepreneurial Underwriter, el boletín mensual para miembros de FASE, y nos gustaría incluir cualquier información relevante para nuestros miembros procedente de su organización.

Este boletín destacará noticias, logros y desarrollos significativos de nuestra comunidad de miembros. Si tiene alguno de los siguientes elementos que le gustaría compartir, por favor envíenoslos:

• Anuncios o hitos de la empresa
• Nuevos nombramientos o actualizaciones del equipo
• Lanzamientos de productos o asociaciones
• Perspectivas del sector o liderazgo de opinión
• Próximos eventos o seminarios web

Por favor, envíe los detalles a admin@fasemga.com antes del martes 28 de enero para su inclusión en la edición de la próxima semana.

The Entrepreneurial Underwriter se distribuirá a todos los miembros de FASE y se publicará en nuestro portal de miembros.`
  },
  it: {
    subject: 'Invito a contribuire: The Entrepreneurial Underwriter',
    body: `Gentile [Nome],

A breve pubblicheremo la prima edizione di The Entrepreneurial Underwriter, il bollettino mensile per i membri FASE, e vorremmo includere eventuali contenuti rilevanti per i nostri membri provenienti dalla vostra organizzazione.

Questo bollettino metterà in evidenza notizie, traguardi e sviluppi significativi della nostra comunità di membri. Se avete uno dei seguenti elementi da condividere, vi preghiamo di inviarceli:

• Annunci aziendali o traguardi raggiunti
• Nuove nomine o aggiornamenti del team
• Lanci di prodotti o partnership
• Approfondimenti di settore o thought leadership
• Eventi o webinar in programma

Vi preghiamo di inviare i dettagli a admin@fasemga.com entro martedì 28 gennaio per l'inclusione nell'edizione della prossima settimana.

The Entrepreneurial Underwriter sarà distribuito a tutti i membri FASE e pubblicato sul nostro portale membri.`
  },
  nl: {
    subject: 'Oproep voor bijdragen: The Entrepreneurial Underwriter',
    body: `Beste [Naam],

Binnenkort brengen we de eerste editie uit van The Entrepreneurial Underwriter, de maandelijkse nieuwsbrief voor FASE-leden, en we willen graag relevante items van uw organisatie opnemen voor onze leden.

Deze nieuwsbrief zal nieuws, prestaties en belangrijke ontwikkelingen uit onze ledengemeenschap uitlichten. Als u een van de volgende items wilt delen, stuur ze dan naar ons:

• Bedrijfsaankondigingen of mijlpalen
• Nieuwe benoemingen of teamupdates
• Productlanceringen of partnerschappen
• Branche-inzichten of thought leadership
• Aankomende evenementen of webinars

Stuur de details naar admin@fasemga.com vóór dinsdag 28 januari voor opname in de editie van volgende week.

The Entrepreneurial Underwriter wordt verspreid onder alle FASE-leden en gepubliceerd op ons ledenportaal.`
  }
};

const languageNames: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands'
};

export default function BulletinTemplateModal({ isOpen, onClose, onApply }: BulletinTemplateModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [recipientName, setRecipientName] = useState('');
  const [deadline, setDeadline] = useState('Tuesday, 28 January');

  if (!isOpen) return null;

  const template = bulletinTemplates[selectedLanguage];

  // Replace placeholders
  const processedBody = template.body
    .replace(/\[Name\]|\[Nom\]|\[Nombre\]|\[Nome\]|\[Naam\]/g, recipientName || '[Name]')
    .replace(/Tuesday, 28 January|mardi 28 janvier|Dienstag, 28. Januar|martes 28 de enero|martedì 28 gennaio|dinsdag 28 januari/g, deadline);

  const handleApply = () => {
    onApply(template.subject, processedBody);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Bulletin Call for Content Template</h2>
          <p className="text-sm text-gray-500 mt-1">Select language and customize the template</p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(bulletinTemplates) as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedLanguage === lang
                      ? 'bg-fase-navy text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {languageNames[lang]}
                </button>
              ))}
            </div>
          </div>

          {/* Customization Fields */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name (optional)</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g., John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline</label>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="e.g., Tuesday, 28 January"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Subject: </span>
              <span className="text-sm text-gray-900">{template.subject}</span>
            </div>
            <div className="p-4 bg-white">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{processedBody}</pre>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Template
          </Button>
        </div>
      </div>
    </div>
  );
}
