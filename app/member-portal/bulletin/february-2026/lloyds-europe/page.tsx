'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useUnifiedAuth } from '../../../../../contexts/UnifiedAuthContext';
import PageLayout from '../../../../../components/PageLayout';
import Image from 'next/image';
import Link from 'next/link';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands'
};

const AVAILABLE_LANGUAGES = ['en', 'fr', 'de', 'es', 'it', 'nl'];

// Translations for all content
const translations: Record<string, {
  category: string;
  title: string;
  content: React.ReactNode;
}> = {
  en: {
    category: 'Feature',
    title: "Lloyd's in Europe: Coverholder Business Growing Fast After 123 Years",
    content: (
      <>
        <p className="text-xl text-gray-800">
          Ever since the pioneering Lloyd&apos;s underwriter, Cuthbert Heath, first granted a binding authority to his agent in Amsterdam, Alfred Schroder, in 1903, Lloyd&apos;s has played a key role in the development of Europe&apos;s delegated authority market.
        </p>

        <p>
          Today, Lloyd&apos;s writes approximately <strong className="text-fase-navy">28% of its total premiums</strong> (€1,685m out of €5,939m) from the European Economic Area plus Switzerland on a delegated authority basis. Five hundred and thirty-two Lloyd&apos;s coverholders, including many of the region&apos;s leading MGAs, underwrite a wide array of business backed by Lloyd&apos;s binding authorities.
        </p>

        <p>
          In recent years, Lloyd&apos;s managing agents&apos; delegated authority business in Europe has surged, growing by <strong className="text-fase-navy">15% annually</strong> between 2023 and 2025. The share of coverholder business in national markets varies widely. In Italy, Lloyd&apos;s 88 coverholders generated 61% of the market&apos;s total premium in 2025; in France the coverholder proportion was 43%; in Ireland, 28%; in Germany, 20%; and in Switzerland just 8%.
        </p>

        <p>
          The overall figures are boosted by Lloyd&apos;s broad definition of what constitutes a coverholder, which includes 61 service companies owned and operated by Lloyd&apos;s managing agents. Coverholder business also includes business underwritten by consortia of Lloyd&apos;s syndicates, under which the lead syndicate operates with delegated authority from following syndicates.
        </p>

        <p>
          Many Lloyd&apos;s coverholders are brokers with tightly worded binding authorities for particular classes of business. They operate as an efficient distribution channel for Lloyd&apos;s products but have little or no underwriting autonomy. But in common with insurance and reinsurance companies around the world, Lloyd&apos;s syndicates have also been increasing their capacity allocations to MGAs.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">No Longer Short-Termist</h2>

        <p>
          Lloyd&apos;s capacity was historically tendered on a short-term – and often opportunistic - basis. But since 2016 Lloyd&apos;s managing agencies have been permitted to enter into multi-year binding authority agreements that can run for up to three years. And this year, Lloyd&apos;s plans to offer the option for continuous contracts that run indefinitely until termination.
        </p>

        <p>
          This aligns with the broader market for capacity, in which larger MGAs in particular have been able to negotiate longer term capacity arrangements with carriers.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Streamlined Accreditation</h2>

        <p>
          Another widely held preconception is that Lloyd&apos;s coverholder accreditation is a lengthy and complex process. It need not be so. The delegated authorities team at Lloyd&apos;s can process coverholder applications within a few days. The due diligence performed by the Lloyd&apos;s managing agent may take much longer, but this is not fundamentally different from the process an insurance company would require.
        </p>

        <p>
          For FASE members, Lloyd&apos;s has provided two valuable guides:
        </p>

        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>
            <a href="/bulletin/feb-2026/lloyds-europe-coverholders-datapoints.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Lloyd&apos;s Europe Coverholders Datapoints
            </a> — charts the scale, composition and growth rate of Lloyd&apos;s coverholder business across nine European markets.
          </li>
          <li>
            <a href="/bulletin/feb-2026/delegated-authority-at-lloyds.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Delegated Authority at Lloyd&apos;s
            </a> — explains the benefits of becoming a Lloyd&apos;s coverholder and how they are remunerated and regulated.
          </li>
        </ul>

        <p>
          One hundred and twenty-three years after Cuthbert Heath first lent his pen to his trusted agent in Amsterdam, Lloyd&apos;s delegated authority business is still driven by the same motivation. In the words of Lloyd&apos;s guide, it permits access to &quot;business that otherwise would not be seen or could not be written economically at the box.&quot; But the relationship between Lloyd&apos;s managing agencies and modern MGAs is today more balanced and the delegation of authority is, often, much broader.
        </p>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 italic">
            Future issues will include interviews with chief underwriting officers at Lloyd&apos;s. Callum Alexander, director of delegated authority at Lloyd&apos;s, will be attending the MGA Rendezvous in May.
          </p>
        </div>
      </>
    )
  },
  fr: {
    category: 'Article de fond',
    title: "Lloyd's en Europe : l'activité des coverholders en forte croissance après 123 ans",
    content: (
      <>
        <p className="text-xl text-gray-800">
          Depuis que le pionnier de la souscription Lloyd&apos;s, Cuthbert Heath, a accordé sa première autorité de souscription à son agent à Amsterdam, Alfred Schroder, en 1903, Lloyd&apos;s joue un rôle clé dans le développement du marché européen de l&apos;autorité déléguée.
        </p>

        <p>
          Aujourd&apos;hui, Lloyd&apos;s souscrit environ <strong className="text-fase-navy">28 % de ses primes totales</strong> (1 685 M€ sur 5 939 M€) dans l&apos;Espace économique européen et en Suisse sur la base d&apos;une autorité déléguée. Cinq cent trente-deux coverholders Lloyd&apos;s, dont nombre des principales agences de souscription de la région, souscrivent un large éventail d&apos;affaires grâce aux binding authorities de Lloyd&apos;s.
        </p>

        <p>
          Ces dernières années, l&apos;activité d&apos;autorité déléguée des managing agents de Lloyd&apos;s en Europe a connu une forte progression, avec une croissance annuelle de <strong className="text-fase-navy">15 %</strong> entre 2023 et 2025. La part des affaires des coverholders dans les marchés nationaux varie considérablement. En Italie, les 88 coverholders de Lloyd&apos;s ont généré 61 % des primes totales du marché en 2025 ; en France, la proportion des coverholders était de 43 % ; en Irlande, 28 % ; en Allemagne, 20 % ; et en Suisse seulement 8 %.
        </p>

        <p>
          Ces chiffres globaux sont amplifiés par la définition large que Lloyd&apos;s donne du coverholder, qui inclut 61 sociétés de services détenues et exploitées par les managing agents de Lloyd&apos;s. Les affaires des coverholders incluent également les affaires souscrites par des consortiums de syndicats Lloyd&apos;s, dans lesquels le syndicat chef de file opère avec une autorité déléguée des syndicats suiveurs.
        </p>

        <p>
          De nombreux coverholders Lloyd&apos;s sont des courtiers disposant d&apos;autorités de souscription très encadrées pour des classes d&apos;affaires particulières. Ils fonctionnent comme un canal de distribution efficace pour les produits Lloyd&apos;s mais disposent de peu ou pas d&apos;autonomie de souscription. Cependant, à l&apos;instar des compagnies d&apos;assurance et de réassurance du monde entier, les syndicats Lloyd&apos;s ont également augmenté leurs allocations de capacité aux agences de souscription.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Fini le court-termisme</h2>

        <p>
          Historiquement, la capacité Lloyd&apos;s était proposée sur une base à court terme – et souvent opportuniste. Mais depuis 2016, les managing agencies de Lloyd&apos;s sont autorisées à conclure des accords de binding authority pluriannuels pouvant aller jusqu&apos;à trois ans. Et cette année, Lloyd&apos;s prévoit d&apos;offrir l&apos;option de contrats continus qui se poursuivent indéfiniment jusqu&apos;à leur résiliation.
        </p>

        <p>
          Cela s&apos;aligne sur le marché plus large de la capacité, dans lequel les grandes agences de souscription en particulier ont pu négocier des arrangements de capacité à plus long terme avec les porteurs de risques.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Accréditation simplifiée</h2>

        <p>
          Une autre idée reçue largement répandue est que l&apos;accréditation de coverholder Lloyd&apos;s est un processus long et complexe. Il n&apos;en est rien. L&apos;équipe des autorités déléguées de Lloyd&apos;s peut traiter les demandes de coverholder en quelques jours. La due diligence effectuée par le managing agent de Lloyd&apos;s peut prendre plus de temps, mais cela n&apos;est pas fondamentalement différent du processus qu&apos;exigerait une compagnie d&apos;assurance.
        </p>

        <p>
          Pour les membres de FASE, Lloyd&apos;s a fourni deux guides précieux :
        </p>

        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>
            <a href="/bulletin/feb-2026/lloyds-europe-coverholders-datapoints.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Lloyd&apos;s Europe Coverholders Datapoints
            </a> — présente l&apos;ampleur, la composition et le taux de croissance de l&apos;activité des coverholders Lloyd&apos;s sur neuf marchés européens.
          </li>
          <li>
            <a href="/bulletin/feb-2026/delegated-authority-at-lloyds.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Delegated Authority at Lloyd&apos;s
            </a> — explique les avantages de devenir coverholder Lloyd&apos;s et comment ils sont rémunérés et réglementés.
          </li>
        </ul>

        <p>
          Cent vingt-trois ans après que Cuthbert Heath a prêté sa plume pour la première fois à son agent de confiance à Amsterdam, l&apos;activité d&apos;autorité déléguée de Lloyd&apos;s est toujours motivée par la même raison. Selon le guide de Lloyd&apos;s, elle permet d&apos;accéder à « des affaires qui autrement ne seraient pas vues ou ne pourraient pas être souscrites de manière économique au box ». Mais la relation entre les managing agencies de Lloyd&apos;s et les agences de souscription modernes est aujourd&apos;hui plus équilibrée et la délégation d&apos;autorité est, souvent, beaucoup plus large.
        </p>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 italic">
            Les prochains numéros incluront des entretiens avec des directeurs de souscription de Lloyd&apos;s. Callum Alexander, directeur de l&apos;autorité déléguée chez Lloyd&apos;s, participera au MGA Rendezvous en mai.
          </p>
        </div>
      </>
    )
  },
  de: {
    category: 'Schwerpunkt',
    title: "Lloyd's in Europa: Coverholder-Geschäft wächst stark nach 123 Jahren",
    content: (
      <>
        <p className="text-xl text-gray-800">
          Seit der Pionier-Underwriter von Lloyd&apos;s, Cuthbert Heath, 1903 erstmals eine Zeichnungsvollmacht an seinen Agenten in Amsterdam, Alfred Schroder, vergab, spielt Lloyd&apos;s eine Schlüsselrolle bei der Entwicklung des europäischen Marktes für delegierte Autorität.
        </p>

        <p>
          Heute zeichnet Lloyd&apos;s etwa <strong className="text-fase-navy">28 % seiner Gesamtprämien</strong> (1.685 Mio. € von 5.939 Mio. €) aus dem Europäischen Wirtschaftsraum plus der Schweiz auf Basis delegierter Autorität. Fünfhundertzweiunddreißig Lloyd&apos;s-Coverholder, darunter viele der führenden MGAs der Region, zeichnen ein breites Spektrum an Geschäft, das durch Lloyd&apos;s Binding Authorities gestützt wird.
        </p>

        <p>
          In den letzten Jahren ist das Geschäft mit delegierter Autorität der Lloyd&apos;s Managing Agents in Europa stark gewachsen – mit einem jährlichen Wachstum von <strong className="text-fase-navy">15 %</strong> zwischen 2023 und 2025. Der Anteil des Coverholder-Geschäfts an den nationalen Märkten variiert erheblich. In Italien erwirtschafteten die 88 Lloyd&apos;s-Coverholder 2025 61 % der Gesamtprämien des Marktes; in Frankreich betrug der Coverholder-Anteil 43 %; in Irland 28 %; in Deutschland 20 %; und in der Schweiz nur 8 %.
        </p>

        <p>
          Die Gesamtzahlen werden durch die weite Definition von Lloyd&apos;s gestützt, was einen Coverholder ausmacht – diese umfasst 61 Serviceunternehmen, die von Lloyd&apos;s Managing Agents betrieben werden. Das Coverholder-Geschäft umfasst auch Geschäft, das von Konsortien aus Lloyd&apos;s-Syndikaten gezeichnet wird, wobei das führende Syndikat mit delegierter Autorität der folgenden Syndikate operiert.
        </p>

        <p>
          Viele Lloyd&apos;s-Coverholder sind Makler mit eng gefassten Zeichnungsvollmachten für bestimmte Geschäftssparten. Sie fungieren als effizienter Vertriebskanal für Lloyd&apos;s-Produkte, haben aber wenig oder keine Underwriting-Autonomie. Aber wie Versicherungs- und Rückversicherungsunternehmen weltweit haben auch Lloyd&apos;s-Syndikate ihre Kapazitätszuweisungen an MGAs erhöht.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Nicht mehr kurzfristig orientiert</h2>

        <p>
          Lloyd&apos;s-Kapazität wurde historisch auf kurzfristiger – und oft opportunistischer – Basis angeboten. Aber seit 2016 ist es Lloyd&apos;s Managing Agencies erlaubt, mehrjährige Binding-Authority-Vereinbarungen abzuschließen, die bis zu drei Jahre laufen können. Und in diesem Jahr plant Lloyd&apos;s, die Option für Dauerverträge anzubieten, die unbefristet bis zur Kündigung laufen.
        </p>

        <p>
          Dies entspricht dem breiteren Kapazitätsmarkt, in dem insbesondere größere MGAs längerfristige Kapazitätsvereinbarungen mit Risikoträgern aushandeln konnten.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Vereinfachte Akkreditierung</h2>

        <p>
          Eine weitere weit verbreitete Vorstellung ist, dass die Lloyd&apos;s-Coverholder-Akkreditierung ein langwieriger und komplexer Prozess sei. Das muss nicht so sein. Das Team für delegierte Autoritäten bei Lloyd&apos;s kann Coverholder-Anträge innerhalb weniger Tage bearbeiten. Die vom Lloyd&apos;s Managing Agent durchgeführte Due Diligence kann länger dauern, aber dies unterscheidet sich grundsätzlich nicht von dem Prozess, den ein Versicherungsunternehmen verlangen würde.
        </p>

        <p>
          Für FASE-Mitglieder hat Lloyd&apos;s zwei wertvolle Leitfäden bereitgestellt:
        </p>

        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>
            <a href="/bulletin/feb-2026/lloyds-europe-coverholders-datapoints.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Lloyd&apos;s Europe Coverholders Datapoints
            </a> — zeigt Umfang, Zusammensetzung und Wachstumsrate des Lloyd&apos;s-Coverholder-Geschäfts in neun europäischen Märkten.
          </li>
          <li>
            <a href="/bulletin/feb-2026/delegated-authority-at-lloyds.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Delegated Authority at Lloyd&apos;s
            </a> — erklärt die Vorteile, ein Lloyd&apos;s-Coverholder zu werden, und wie diese vergütet und reguliert werden.
          </li>
        </ul>

        <p>
          Einhundertdreiundzwanzig Jahre nachdem Cuthbert Heath erstmals seinen Stift seinem vertrauten Agenten in Amsterdam lieh, wird das Geschäft mit delegierter Autorität von Lloyd&apos;s immer noch von der gleichen Motivation angetrieben. In den Worten des Lloyd&apos;s-Leitfadens ermöglicht es den Zugang zu &bdquo;Geschäft, das sonst nicht gesehen würde oder nicht wirtschaftlich am Box gezeichnet werden könnte.&ldquo; Aber die Beziehung zwischen Lloyd&apos;s Managing Agencies und modernen MGAs ist heute ausgewogener und die Delegation der Autorität ist oft viel breiter.
        </p>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 italic">
            Zukünftige Ausgaben werden Interviews mit Chief Underwriting Officers bei Lloyd&apos;s enthalten. Callum Alexander, Director of Delegated Authority bei Lloyd&apos;s, wird am MGA Rendezvous im Mai teilnehmen.
          </p>
        </div>
      </>
    )
  },
  es: {
    category: 'Artículo destacado',
    title: "Lloyd's en Europa: el negocio de coverholders crece rápidamente tras 123 años",
    content: (
      <>
        <p className="text-xl text-gray-800">
          Desde que el pionero suscriptor de Lloyd&apos;s, Cuthbert Heath, otorgó por primera vez una autoridad de suscripción a su agente en Ámsterdam, Alfred Schroder, en 1903, Lloyd&apos;s ha desempeñado un papel clave en el desarrollo del mercado europeo de autoridad delegada.
        </p>

        <p>
          Hoy, Lloyd&apos;s suscribe aproximadamente el <strong className="text-fase-navy">28% de sus primas totales</strong> (1.685 millones de euros de 5.939 millones de euros) del Espacio Económico Europeo más Suiza sobre la base de autoridad delegada. Quinientos treinta y dos coverholders de Lloyd&apos;s, incluyendo muchas de las principales agencias de suscripción de la región, suscriben una amplia variedad de negocios respaldados por las binding authorities de Lloyd&apos;s.
        </p>

        <p>
          En los últimos años, el negocio de autoridad delegada de los managing agents de Lloyd&apos;s en Europa ha experimentado un fuerte crecimiento, aumentando un <strong className="text-fase-navy">15% anual</strong> entre 2023 y 2025. La cuota del negocio de coverholders en los mercados nacionales varía ampliamente. En Italia, los 88 coverholders de Lloyd&apos;s generaron el 61% de las primas totales del mercado en 2025; en Francia, la proporción de coverholders fue del 43%; en Irlanda, del 28%; en Alemania, del 20%; y en Suiza, solo del 8%.
        </p>

        <p>
          Las cifras globales se ven impulsadas por la amplia definición de Lloyd&apos;s de lo que constituye un coverholder, que incluye 61 empresas de servicios propiedad y operadas por los managing agents de Lloyd&apos;s. El negocio de coverholders también incluye negocios suscritos por consorcios de sindicatos de Lloyd&apos;s, en los que el sindicato líder opera con autoridad delegada de los sindicatos seguidores.
        </p>

        <p>
          Muchos coverholders de Lloyd&apos;s son corredores con autoridades de suscripción muy específicas para clases particulares de negocio. Funcionan como un canal de distribución eficiente para los productos de Lloyd&apos;s, pero tienen poca o ninguna autonomía de suscripción. Sin embargo, al igual que las compañías de seguros y reaseguros de todo el mundo, los sindicatos de Lloyd&apos;s también han aumentado sus asignaciones de capacidad a las agencias de suscripción.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Adiós al cortoplacismo</h2>

        <p>
          Históricamente, la capacidad de Lloyd&apos;s se ofrecía a corto plazo, y a menudo de forma oportunista. Pero desde 2016, las managing agencies de Lloyd&apos;s están autorizadas a celebrar acuerdos de binding authority plurianuales que pueden extenderse hasta tres años. Y este año, Lloyd&apos;s planea ofrecer la opción de contratos continuos que se extienden indefinidamente hasta su terminación.
        </p>

        <p>
          Esto se alinea con el mercado más amplio de capacidad, en el que las agencias de suscripción más grandes en particular han podido negociar acuerdos de capacidad a más largo plazo con los portadores de riesgo.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Acreditación simplificada</h2>

        <p>
          Otra idea preconcebida muy extendida es que la acreditación de coverholder de Lloyd&apos;s es un proceso largo y complejo. No tiene por qué serlo. El equipo de autoridades delegadas de Lloyd&apos;s puede procesar las solicitudes de coverholder en pocos días. La debida diligencia realizada por el managing agent de Lloyd&apos;s puede llevar más tiempo, pero esto no es fundamentalmente diferente del proceso que requeriría una compañía de seguros.
        </p>

        <p>
          Para los miembros de FASE, Lloyd&apos;s ha proporcionado dos guías valiosas:
        </p>

        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>
            <a href="/bulletin/feb-2026/lloyds-europe-coverholders-datapoints.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Lloyd&apos;s Europe Coverholders Datapoints
            </a> — muestra la escala, composición y tasa de crecimiento del negocio de coverholders de Lloyd&apos;s en nueve mercados europeos.
          </li>
          <li>
            <a href="/bulletin/feb-2026/delegated-authority-at-lloyds.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Delegated Authority at Lloyd&apos;s
            </a> — explica los beneficios de convertirse en coverholder de Lloyd&apos;s y cómo se les remunera y regula.
          </li>
        </ul>

        <p>
          Ciento veintitrés años después de que Cuthbert Heath prestara por primera vez su pluma a su agente de confianza en Ámsterdam, el negocio de autoridad delegada de Lloyd&apos;s sigue impulsado por la misma motivación. En palabras de la guía de Lloyd&apos;s, permite el acceso a «negocios que de otro modo no se verían o no podrían suscribirse económicamente en el box». Pero la relación entre las managing agencies de Lloyd&apos;s y las agencias de suscripción modernas es hoy más equilibrada y la delegación de autoridad es, a menudo, mucho más amplia.
        </p>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 italic">
            Los próximos números incluirán entrevistas con directores de suscripción de Lloyd&apos;s. Callum Alexander, director de autoridad delegada de Lloyd&apos;s, asistirá al MGA Rendezvous en mayo.
          </p>
        </div>
      </>
    )
  },
  it: {
    category: 'Approfondimento',
    title: "Lloyd's in Europa: il business dei coverholder in forte crescita dopo 123 anni",
    content: (
      <>
        <p className="text-xl text-gray-800">
          Da quando il pioniere della sottoscrizione di Lloyd&apos;s, Cuthbert Heath, concesse per la prima volta un&apos;autorità di sottoscrizione al suo agente ad Amsterdam, Alfred Schroder, nel 1903, Lloyd&apos;s ha svolto un ruolo chiave nello sviluppo del mercato europeo della delega di autorità.
        </p>

        <p>
          Oggi, Lloyd&apos;s sottoscrive circa il <strong className="text-fase-navy">28% dei suoi premi totali</strong> (1.685 milioni di euro su 5.939 milioni di euro) dallo Spazio Economico Europeo più la Svizzera su base di autorità delegata. Cinquecentotrentadue coverholder di Lloyd&apos;s, tra cui molte delle principali agenzie di sottoscrizione della regione, sottoscrivono un&apos;ampia gamma di affari supportati dalle binding authority di Lloyd&apos;s.
        </p>

        <p>
          Negli ultimi anni, il business di autorità delegata dei managing agent di Lloyd&apos;s in Europa è cresciuto rapidamente, con una crescita annuale del <strong className="text-fase-navy">15%</strong> tra il 2023 e il 2025. La quota del business dei coverholder nei mercati nazionali varia ampiamente. In Italia, gli 88 coverholder di Lloyd&apos;s hanno generato il 61% dei premi totali del mercato nel 2025; in Francia la proporzione dei coverholder era del 43%; in Irlanda del 28%; in Germania del 20%; e in Svizzera solo dell&apos;8%.
        </p>

        <p>
          I dati complessivi sono amplificati dalla definizione ampia che Lloyd&apos;s dà di coverholder, che include 61 società di servizi possedute e gestite dai managing agent di Lloyd&apos;s. Il business dei coverholder include anche affari sottoscritti da consorzi di sindacati Lloyd&apos;s, in cui il sindacato capofila opera con autorità delegata dai sindacati partecipanti.
        </p>

        <p>
          Molti coverholder di Lloyd&apos;s sono broker con autorità di sottoscrizione strettamente definite per particolari classi di affari. Operano come un canale di distribuzione efficiente per i prodotti Lloyd&apos;s ma hanno poca o nessuna autonomia di sottoscrizione. Tuttavia, come le compagnie di assicurazione e riassicurazione di tutto il mondo, anche i sindacati Lloyd&apos;s hanno aumentato le loro allocazioni di capacità alle agenzie di sottoscrizione.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Non più a breve termine</h2>

        <p>
          Storicamente, la capacità di Lloyd&apos;s veniva offerta su base a breve termine – e spesso opportunistica. Ma dal 2016, alle managing agency di Lloyd&apos;s è permesso stipulare accordi di binding authority pluriennali che possono durare fino a tre anni. E quest&apos;anno, Lloyd&apos;s prevede di offrire l&apos;opzione di contratti continuativi che si estendono a tempo indeterminato fino alla cessazione.
        </p>

        <p>
          Questo si allinea con il più ampio mercato della capacità, in cui le agenzie di sottoscrizione più grandi in particolare sono state in grado di negoziare accordi di capacità a più lungo termine con i carrier.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Accreditamento semplificato</h2>

        <p>
          Un altro preconcetto diffuso è che l&apos;accreditamento come coverholder Lloyd&apos;s sia un processo lungo e complesso. Non è necessariamente così. Il team delle autorità delegate di Lloyd&apos;s può elaborare le domande dei coverholder in pochi giorni. La due diligence eseguita dal managing agent di Lloyd&apos;s può richiedere più tempo, ma questo non è fondamentalmente diverso dal processo che richiederebbe una compagnia di assicurazione.
        </p>

        <p>
          Per i membri FASE, Lloyd&apos;s ha fornito due guide preziose:
        </p>

        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>
            <a href="/bulletin/feb-2026/lloyds-europe-coverholders-datapoints.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Lloyd&apos;s Europe Coverholders Datapoints
            </a> — illustra la scala, la composizione e il tasso di crescita del business dei coverholder Lloyd&apos;s in nove mercati europei.
          </li>
          <li>
            <a href="/bulletin/feb-2026/delegated-authority-at-lloyds.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Delegated Authority at Lloyd&apos;s
            </a> — spiega i vantaggi di diventare coverholder Lloyd&apos;s e come vengono remunerati e regolamentati.
          </li>
        </ul>

        <p>
          Centoventitre anni dopo che Cuthbert Heath prestò per la prima volta la sua penna al suo agente di fiducia ad Amsterdam, il business di autorità delegata di Lloyd&apos;s è ancora guidato dalla stessa motivazione. Nelle parole della guida di Lloyd&apos;s, permette l&apos;accesso a «affari che altrimenti non verrebbero visti o non potrebbero essere sottoscritti economicamente al box». Ma la relazione tra le managing agency di Lloyd&apos;s e le moderne agenzie di sottoscrizione è oggi più equilibrata e la delega di autorità è, spesso, molto più ampia.
        </p>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 italic">
            I prossimi numeri includeranno interviste con chief underwriting officer di Lloyd&apos;s. Callum Alexander, direttore dell&apos;autorità delegata di Lloyd&apos;s, parteciperà al MGA Rendezvous a maggio.
          </p>
        </div>
      </>
    )
  },
  nl: {
    category: 'Hoofdartikel',
    title: "Lloyd's in Europa: coverholder-activiteiten groeien snel na 123 jaar",
    content: (
      <>
        <p className="text-xl text-gray-800">
          Sinds de pionier van Lloyd&apos;s underwriting, Cuthbert Heath, in 1903 voor het eerst een volmacht verleende aan zijn agent in Amsterdam, Alfred Schroder, speelt Lloyd&apos;s een sleutelrol in de ontwikkeling van de Europese markt voor gedelegeerde autoriteit.
        </p>

        <p>
          Vandaag de dag schrijft Lloyd&apos;s ongeveer <strong className="text-fase-navy">28% van zijn totale premies</strong> (€1.685 miljoen van €5.939 miljoen) uit de Europese Economische Ruimte plus Zwitserland op basis van gedelegeerde autoriteit. Vijfhonderdtweeëndertig Lloyd&apos;s coverholders, waaronder veel van de toonaangevende gevolmachtigd agenten van de regio, schrijven een breed scala aan zaken gedekt door Lloyd&apos;s binding authorities.
        </p>

        <p>
          In de afgelopen jaren is de gedelegeerde autoriteit-activiteit van Lloyd&apos;s managing agents in Europa sterk gegroeid, met een jaarlijkse groei van <strong className="text-fase-navy">15%</strong> tussen 2023 en 2025. Het aandeel van coverholder-activiteiten in nationale markten varieert sterk. In Italië genereerden de 88 Lloyd&apos;s coverholders 61% van de totale marktpremie in 2025; in Frankrijk was het coverholder-aandeel 43%; in Ierland 28%; in Duitsland 20%; en in Zwitserland slechts 8%.
        </p>

        <p>
          De totaalcijfers worden versterkt door Lloyd&apos;s brede definitie van wat een coverholder is, die 61 serviceondernemingen omvat die eigendom zijn van en worden beheerd door Lloyd&apos;s managing agents. Coverholder-activiteiten omvatten ook zaken die worden geschreven door consortia van Lloyd&apos;s syndicaten, waarbij het leidende syndicaat opereert met gedelegeerde autoriteit van volgende syndicaten.
        </p>

        <p>
          Veel Lloyd&apos;s coverholders zijn makelaars met strikt geformuleerde volmachten voor bepaalde productklassen. Zij fungeren als een efficiënt distributiekanaal voor Lloyd&apos;s producten maar hebben weinig tot geen acceptatie-autonomie. Maar net als verzekerings- en herverzekeringsmaatschappijen wereldwijd hebben Lloyd&apos;s syndicaten ook hun capaciteitstoewijzingen aan gevolmachtigd agenten verhoogd.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Niet langer kortetermijngericht</h2>

        <p>
          Lloyd&apos;s capaciteit werd historisch gezien op korte termijn – en vaak opportunistisch – aangeboden. Maar sinds 2016 mogen Lloyd&apos;s managing agencies meerjarige binding authority-overeenkomsten aangaan die tot drie jaar kunnen lopen. En dit jaar is Lloyd&apos;s van plan de optie aan te bieden voor doorlopende contracten die onbeperkt doorlopen tot beëindiging.
        </p>

        <p>
          Dit sluit aan bij de bredere capaciteitsmarkt, waarin met name grotere gevolmachtigd agenten langere termijn capaciteitsafspraken met verzekeraars hebben kunnen onderhandelen.
        </p>

        <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Gestroomlijnde accreditatie</h2>

        <p>
          Een andere wijdverspreide misvatting is dat Lloyd&apos;s coverholder-accreditatie een langdurig en complex proces is. Dat hoeft niet zo te zijn. Het team voor gedelegeerde autoriteiten bij Lloyd&apos;s kan coverholder-aanvragen binnen enkele dagen verwerken. De due diligence uitgevoerd door de Lloyd&apos;s managing agent kan langer duren, maar dit verschilt niet fundamenteel van het proces dat een verzekeringsmaatschappij zou vereisen.
        </p>

        <p>
          Voor FASE-leden heeft Lloyd&apos;s twee waardevolle gidsen aangeleverd:
        </p>

        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>
            <a href="/bulletin/feb-2026/lloyds-europe-coverholders-datapoints.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Lloyd&apos;s Europe Coverholders Datapoints
            </a> — toont de omvang, samenstelling en groeisnelheid van Lloyd&apos;s coverholder-activiteiten in negen Europese markten.
          </li>
          <li>
            <a href="/bulletin/feb-2026/delegated-authority-at-lloyds.pdf" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline">
              Delegated Authority at Lloyd&apos;s
            </a> — legt de voordelen uit van het worden van een Lloyd&apos;s coverholder en hoe zij worden vergoed en gereguleerd.
          </li>
        </ul>

        <p>
          Honderddrieëntwintig jaar nadat Cuthbert Heath voor het eerst zijn pen leende aan zijn vertrouwde agent in Amsterdam, wordt Lloyd&apos;s gedelegeerde autoriteit-activiteit nog steeds gedreven door dezelfde motivatie. In de woorden van Lloyd&apos;s gids, het geeft toegang tot «zaken die anders niet gezien zouden worden of niet economisch aan de box geschreven zouden kunnen worden». Maar de relatie tussen Lloyd&apos;s managing agencies en moderne gevolmachtigd agenten is vandaag de dag evenwichtiger en de delegatie van autoriteit is vaak veel breder.
        </p>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 italic">
            Toekomstige edities zullen interviews bevatten met chief underwriting officers bij Lloyd&apos;s. Callum Alexander, director of delegated authority bij Lloyd&apos;s, zal aanwezig zijn op de MGA Rendezvous in mei.
          </p>
        </div>
      </>
    )
  }
};

function ChartModal({
  isOpen,
  onClose,
  src,
  alt,
  title
}: {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  title: string;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-fase-navy">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <Image
            src={src}
            alt={alt}
            width={838}
            height={600}
            className="w-full h-auto"
          />
        </div>
        <div className="px-5 py-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
          Source: Lloyd&apos;s
        </div>
      </div>
    </div>
  );
}

function ChartFigure({
  src,
  alt,
  title,
  caption
}: {
  src: string;
  alt: string;
  title: string;
  caption: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <figure
        className="group cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative overflow-hidden rounded border border-gray-200 bg-white">
          <Image
            src={src}
            alt={alt}
            width={838}
            height={500}
            className="w-full h-auto transition-transform group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-fase-navy text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
              Click to expand
            </span>
          </div>
        </div>
        <figcaption className="mt-2 text-xs text-gray-500">{caption}</figcaption>
      </figure>
      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        src={src}
        alt={alt}
        title={title}
      />
    </>
  );
}

export default function LloydsEuropeArticle() {
  const { user, loading } = useUnifiedAuth();
  const router = useRouter();
  const locale = useLocale();
  const [currentLang, setCurrentLang] = useState(locale);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/member-portal/bulletin/february-2026/lloyds-europe');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Update language when locale changes
    if (translations[locale]) {
      setCurrentLang(locale);
    }
  }, [locale]);

  if (loading) {
    return (
      <PageLayout currentPage="member-portal">
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return null;
  }

  const t = translations[currentLang] || translations.en;

  return (
    <PageLayout currentPage="member-portal">
      <main className="min-h-screen bg-white">
        {/* Hero */}
        <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
          <Image
            src="/bulletin/feb-2026/lloyds-building.jpg"
            alt="Lloyd's of London"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-5xl mx-auto px-6 pb-12 w-full">
              <Link
                href="/member-portal/bulletin/february-2026"
                className="inline-flex items-center text-white/60 hover:text-white text-sm mb-6 transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                February 2026
              </Link>
              <p className="text-fase-gold text-xs font-semibold uppercase tracking-widest mb-3">{t.category}</p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-noto-serif font-bold text-white leading-tight max-w-3xl">
                {t.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Language Selector */}
        <div className="bg-gray-50 border-b border-gray-200 py-4">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="font-medium">Also available in:</span>
              <div className="flex items-center space-x-3">
                {AVAILABLE_LANGUAGES.map((lang, index) => (
                  <div key={lang} className="flex items-center space-x-3">
                    <button
                      onClick={() => setCurrentLang(lang)}
                      className={`hover:underline ${
                        lang === currentLang
                          ? 'text-fase-navy font-semibold'
                          : 'text-fase-navy'
                      }`}
                    >
                      {LANGUAGE_NAMES[lang]}
                    </button>
                    {index < AVAILABLE_LANGUAGES.length - 1 && (
                      <span className="text-gray-300">•</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="max-w-5xl mx-auto px-6">

          {/* Two column layout: Text | Charts */}
          <div className="py-10">
            <div className="lg:grid lg:grid-cols-5 lg:gap-16">
              {/* Text column */}
              <div className="lg:col-span-3 text-gray-700 leading-relaxed space-y-6">
                {t.content}
              </div>

              {/* Charts column */}
              <div className="lg:col-span-2 mt-10 lg:mt-0 space-y-8">
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-pie-chart.png"
                  alt="Lloyd's Binder Business breakdown by class"
                  title="Lloyd's Binder Business, EEA + Switzerland, 2025"
                  caption="Binder business by class. Total: €1.685bn"
                />
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-coverholder-count.png"
                  alt="Number of Lloyd's coverholders by country"
                  title="Accredited Lloyd's Coverholders by Country, 2025"
                  caption="Number of accredited coverholders by market"
                />
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-penetration.png"
                  alt="Coverholder penetration by market"
                  title="Coverholder Penetration by Market, 2025"
                  caption="Penetration ranges from 61% (Italy) to 8% (Switzerland)"
                />
              </div>
            </div>
          </div>

          {/* Back link */}
          <div className="pb-12">
            <Link
              href="/member-portal/bulletin/february-2026"
              className="inline-flex items-center text-fase-navy text-sm font-medium hover:underline"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to February 2026 Edition
            </Link>
          </div>
        </article>
      </main>
    </PageLayout>
  );
}
