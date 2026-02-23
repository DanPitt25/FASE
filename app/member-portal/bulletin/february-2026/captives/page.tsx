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

const translations: Record<string, {
  category: string;
  title: string;
  author: string;
  lead: React.ReactNode;
  content: React.ReactNode;
  footer: string;
}> = {
  en: {
    category: 'Contributed Article',
    title: 'Seven Reasons to Consider a Captive',
    author: 'By Mark Elliott, Polo Insurance Managers',
    lead: (
      <p className="text-lg text-gray-800 leading-relaxed mb-8">
        The role of reinsurance captives has been growing in the capacity stack of MGAs in the United States and United Kingdom. In the first of a series of monthly articles on captive management issues, Mark Elliott, CEO of Guernsey-based Polo Insurance Managers, highlights the top seven reasons why profitable MGAs of all sizes across Europe should consider establishing a captive.
      </p>
    ),
    content: (
      <>
        <p>
          It is estimated that there are over 300 MGAs in the UK retaining some of their own risk. But in continental Europe, MGAs have generally been slower to retain risk through captives. For MGAs that can demonstrate a profitable track record, there are seven good reasons to consider retaining risk through a captive.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">1. Enhanced Margin Capture</h2>
        <p>
          Retaining a portion of the risk allows the MGA to participate directly in underwriting profits rather than ceding all value to capacity providers.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">2. Greater Control Over Capacity</h2>
        <p>
          A captive reduces dependence on third-party insurers and reinsurers, improving resilience during hard markets or sudden capacity withdrawals.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">3. Alignment of Underwriting Incentives</h2>
        <p>
          Retention enforces stronger underwriting discipline by directly linking portfolio performance to the MGA&apos;s own capital at risk.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">4. Improved Negotiating Power with Carriers</h2>
        <p>
          Demonstrated &quot;skin in the game&quot; strengthens credibility and can lead to better commission terms, profit shares, and long-term capacity agreements. Indeed we have seen some clients who managed to increase commission just by having the captive in place – they didn&apos;t even take a retention initially.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">5. Access to Reinsurance Markets on Better Terms</h2>
        <p>
          A captive can access quota share or excess-of-loss reinsurance directly, often at more efficient pricing than through fronted arrangements alone. There is still an insurance / reinsurance pricing arbitrage which we often see – especially when the incumbent insurer has been on the programme for many years.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">6. Portfolio Diversification and Capital Efficiency</h2>
        <p>
          Well-structured captives (often domiciled in EU-friendly jurisdictions) allow optimized capital usage across lines, geographies, and cycles. Traditionally Malta is an excellent location for direct EU access, but requires scale. Guernsey can operate using a fronting insurer and can sometimes be more cost-effective from a cost and capital perspective for smaller programmes.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">7. Strategic Optionality and Scalability</h2>
        <p>
          Captives enable controlled experimentation with new products, niches, or geographies without full reliance on external carriers. We need many new start-ups and the incubation of new products in their own captive helps collect data and demonstrates to insurers a positive alignment of interest.
        </p>
      </>
    ),
    footer: 'In the March issue, we will dig further into the practicalities of captive establishment – and the merits of different domiciles – for European MGAs.'
  },
  fr: {
    category: 'Article contributif',
    title: 'Sept raisons d\'envisager une captive',
    author: 'Par Mark Elliott, Polo Insurance Managers',
    lead: (
      <p className="text-lg text-gray-800 leading-relaxed mb-8">
        Le rôle des captives de réassurance s&apos;est développé dans la structure de capacité des agences de souscription aux États-Unis et au Royaume-Uni. Dans le premier d&apos;une série d&apos;articles mensuels sur les questions de gestion des captives, Mark Elliott, PDG de Polo Insurance Managers, basé à Guernesey, présente les sept principales raisons pour lesquelles les agences de souscription rentables de toutes tailles en Europe devraient envisager de créer une captive.
      </p>
    ),
    content: (
      <>
        <p>
          On estime qu&apos;il existe plus de 300 agences de souscription au Royaume-Uni qui conservent une partie de leur propre risque. Mais en Europe continentale, les agences de souscription ont généralement été plus lentes à conserver le risque via des captives. Pour les agences de souscription capables de démontrer un historique de rentabilité, il existe sept bonnes raisons d&apos;envisager la conservation du risque via une captive.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">1. Amélioration de la capture de marge</h2>
        <p>
          La conservation d&apos;une partie du risque permet à l&apos;agence de souscription de participer directement aux bénéfices techniques plutôt que de céder toute la valeur aux fournisseurs de capacité.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">2. Meilleur contrôle de la capacité</h2>
        <p>
          Une captive réduit la dépendance vis-à-vis des assureurs et réassureurs tiers, améliorant la résilience pendant les marchés durs ou les retraits soudains de capacité.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">3. Alignement des incitations à la souscription</h2>
        <p>
          La conservation renforce la discipline de souscription en liant directement la performance du portefeuille au capital propre de l&apos;agence de souscription exposé au risque.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">4. Amélioration du pouvoir de négociation avec les porteurs de risque</h2>
        <p>
          Démontrer un « engagement personnel » renforce la crédibilité et peut conduire à de meilleures conditions de commission, des participations aux bénéfices et des accords de capacité à long terme. Nous avons effectivement vu certains clients qui ont réussi à augmenter leur commission simplement en mettant en place la captive – ils n&apos;ont même pas pris de rétention au départ.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">5. Accès aux marchés de la réassurance à de meilleures conditions</h2>
        <p>
          Une captive peut accéder directement à la réassurance en quote-part ou en excédent de sinistre, souvent à des tarifs plus avantageux qu&apos;à travers des arrangements de fronting seuls. Il existe encore un arbitrage de prix assurance/réassurance que nous observons souvent – surtout lorsque l&apos;assureur en place est sur le programme depuis de nombreuses années.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">6. Diversification du portefeuille et efficacité du capital</h2>
        <p>
          Les captives bien structurées (souvent domiciliées dans des juridictions favorables à l&apos;UE) permettent une utilisation optimisée du capital à travers les lignes, les géographies et les cycles. Traditionnellement, Malte est un excellent emplacement pour un accès direct à l&apos;UE, mais nécessite une certaine envergure. Guernesey peut fonctionner en utilisant un assureur fronting et peut parfois être plus rentable du point de vue des coûts et du capital pour les programmes plus petits.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">7. Optionnalité stratégique et évolutivité</h2>
        <p>
          Les captives permettent une expérimentation contrôlée avec de nouveaux produits, niches ou géographies sans dépendance totale vis-à-vis des porteurs de risques externes. Nous avons besoin de nombreuses nouvelles start-ups et l&apos;incubation de nouveaux produits dans leur propre captive aide à collecter des données et démontre aux assureurs un alignement positif des intérêts.
        </p>
      </>
    ),
    footer: 'Dans le numéro de mars, nous approfondirons les aspects pratiques de la création d\'une captive – et les mérites des différents domiciles – pour les agences de souscription européennes.'
  },
  de: {
    category: 'Gastbeitrag',
    title: 'Sieben Gründe für eine Captive',
    author: 'Von Mark Elliott, Polo Insurance Managers',
    lead: (
      <p className="text-lg text-gray-800 leading-relaxed mb-8">
        Die Rolle von Rückversicherungs-Captives hat in der Kapazitätsstruktur von MGAs in den Vereinigten Staaten und im Vereinigten Königreich zugenommen. Im ersten einer Reihe monatlicher Artikel zu Captive-Management-Themen stellt Mark Elliott, CEO von Polo Insurance Managers mit Sitz in Guernsey, die sieben wichtigsten Gründe vor, warum profitable MGAs aller Größen in Europa die Gründung einer Captive in Betracht ziehen sollten.
      </p>
    ),
    content: (
      <>
        <p>
          Es wird geschätzt, dass es im Vereinigten Königreich über 300 MGAs gibt, die einen Teil ihres eigenen Risikos behalten. Aber in Kontinentaleuropa waren MGAs generell langsamer dabei, Risiko über Captives zu behalten. Für MGAs, die eine profitable Erfolgsbilanz vorweisen können, gibt es sieben gute Gründe, die Risikobehaltung über eine Captive in Betracht zu ziehen.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">1. Verbesserte Margenerfassung</h2>
        <p>
          Die Behaltung eines Teils des Risikos ermöglicht es dem MGA, direkt an den versicherungstechnischen Gewinnen teilzunehmen, anstatt den gesamten Wert an Kapazitätsgeber abzutreten.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">2. Größere Kontrolle über Kapazität</h2>
        <p>
          Eine Captive reduziert die Abhängigkeit von Drittversicherern und Rückversicherern und verbessert die Widerstandsfähigkeit in harten Märkten oder bei plötzlichen Kapazitätsrückzügen.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">3. Angleichung der Underwriting-Anreize</h2>
        <p>
          Die Retention erzwingt eine stärkere Underwriting-Disziplin, indem die Portfolio-Performance direkt mit dem eigenen Risikokapital des MGA verknüpft wird.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">4. Verbesserte Verhandlungsposition gegenüber Risikoträgern</h2>
        <p>
          Nachgewiesenes „Skin in the Game" stärkt die Glaubwürdigkeit und kann zu besseren Provisionskonditionen, Gewinnbeteiligungen und langfristigen Kapazitätsvereinbarungen führen. Tatsächlich haben wir Kunden erlebt, die ihre Provision allein durch die Einrichtung einer Captive erhöhen konnten – sie haben anfangs nicht einmal eine Retention übernommen.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">5. Zugang zu Rückversicherungsmärkten zu besseren Konditionen</h2>
        <p>
          Eine Captive kann direkt auf Quotenrückversicherung oder Schadenexzedentenrückversicherung zugreifen, oft zu effizienteren Preisen als nur über Fronting-Arrangements. Es gibt immer noch eine Versicherungs-/Rückversicherungs-Preisarbitrage, die wir häufig sehen – besonders wenn der bisherige Versicherer schon viele Jahre im Programm ist.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">6. Portfoliodiversifikation und Kapitaleffizienz</h2>
        <p>
          Gut strukturierte Captives (oft in EU-freundlichen Jurisdiktionen domiziliert) ermöglichen eine optimierte Kapitalnutzung über Sparten, Geografien und Zyklen hinweg. Traditionell ist Malta ein ausgezeichneter Standort für direkten EU-Zugang, erfordert aber Skalierung. Guernsey kann mit einem Fronting-Versicherer arbeiten und kann manchmal aus Kosten- und Kapitalperspektive für kleinere Programme kosteneffektiver sein.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">7. Strategische Optionalität und Skalierbarkeit</h2>
        <p>
          Captives ermöglichen kontrollierte Experimente mit neuen Produkten, Nischen oder Geografien ohne vollständige Abhängigkeit von externen Risikoträgern. Wir brauchen viele neue Start-ups, und die Inkubation neuer Produkte in der eigenen Captive hilft, Daten zu sammeln und demonstriert Versicherern eine positive Interessenausrichtung.
        </p>
      </>
    ),
    footer: 'In der März-Ausgabe werden wir tiefer in die praktischen Aspekte der Captive-Gründung – und die Vorzüge verschiedener Domizile – für europäische MGAs eintauchen.'
  },
  es: {
    category: 'Artículo colaborativo',
    title: 'Siete razones para considerar una cautiva',
    author: 'Por Mark Elliott, Polo Insurance Managers',
    lead: (
      <p className="text-lg text-gray-800 leading-relaxed mb-8">
        El papel de las cautivas de reaseguro ha crecido en la estructura de capacidad de las agencias de suscripción en Estados Unidos y Reino Unido. En el primero de una serie de artículos mensuales sobre temas de gestión de cautivas, Mark Elliott, CEO de Polo Insurance Managers, con sede en Guernsey, destaca las siete principales razones por las que las agencias de suscripción rentables de todos los tamaños en Europa deberían considerar establecer una cautiva.
      </p>
    ),
    content: (
      <>
        <p>
          Se estima que hay más de 300 agencias de suscripción en el Reino Unido que retienen parte de su propio riesgo. Pero en Europa continental, las agencias de suscripción han sido generalmente más lentas en retener riesgo a través de cautivas. Para las agencias de suscripción que pueden demostrar un historial de rentabilidad, hay siete buenas razones para considerar la retención de riesgo a través de una cautiva.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">1. Mayor captura de margen</h2>
        <p>
          Retener una parte del riesgo permite a la agencia de suscripción participar directamente en los beneficios técnicos en lugar de ceder todo el valor a los proveedores de capacidad.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">2. Mayor control sobre la capacidad</h2>
        <p>
          Una cautiva reduce la dependencia de aseguradoras y reaseguradoras externas, mejorando la resiliencia durante mercados duros o retiros repentinos de capacidad.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">3. Alineación de incentivos de suscripción</h2>
        <p>
          La retención impone una disciplina de suscripción más fuerte al vincular directamente el rendimiento de la cartera con el capital propio de la agencia de suscripción en riesgo.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">4. Mayor poder de negociación con las aseguradoras</h2>
        <p>
          Demostrar tener «piel en el juego» fortalece la credibilidad y puede conducir a mejores términos de comisión, participación en beneficios y acuerdos de capacidad a largo plazo. De hecho, hemos visto clientes que lograron aumentar su comisión simplemente por tener la cautiva establecida – ni siquiera tomaron una retención inicialmente.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">5. Acceso a mercados de reaseguro en mejores condiciones</h2>
        <p>
          Una cautiva puede acceder directamente a reaseguro de cuota parte o exceso de pérdida, a menudo a precios más eficientes que solo a través de acuerdos de fronting. Todavía existe un arbitraje de precios seguro/reaseguro que vemos a menudo – especialmente cuando la aseguradora actual ha estado en el programa durante muchos años.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">6. Diversificación de cartera y eficiencia de capital</h2>
        <p>
          Las cautivas bien estructuradas (a menudo domiciliadas en jurisdicciones favorables a la UE) permiten un uso optimizado del capital a través de líneas, geografías y ciclos. Tradicionalmente, Malta es una excelente ubicación para acceso directo a la UE, pero requiere escala. Guernsey puede operar utilizando una aseguradora de fronting y a veces puede ser más rentable desde una perspectiva de costos y capital para programas más pequeños.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">7. Opcionalidad estratégica y escalabilidad</h2>
        <p>
          Las cautivas permiten la experimentación controlada con nuevos productos, nichos o geografías sin dependencia total de aseguradoras externas. Necesitamos muchas nuevas startups, y la incubación de nuevos productos en su propia cautiva ayuda a recopilar datos y demuestra a las aseguradoras una alineación positiva de intereses.
        </p>
      </>
    ),
    footer: 'En el número de marzo, profundizaremos en los aspectos prácticos del establecimiento de cautivas – y los méritos de diferentes domicilios – para las agencias de suscripción europeas.'
  },
  it: {
    category: 'Articolo contributivo',
    title: 'Sette motivi per considerare una captive',
    author: 'Di Mark Elliott, Polo Insurance Managers',
    lead: (
      <p className="text-lg text-gray-800 leading-relaxed mb-8">
        Il ruolo delle captive di riassicurazione è cresciuto nella struttura di capacità delle agenzie di sottoscrizione negli Stati Uniti e nel Regno Unito. Nel primo di una serie di articoli mensili sulle questioni di gestione delle captive, Mark Elliott, CEO di Polo Insurance Managers, con sede a Guernsey, evidenzia i sette principali motivi per cui le agenzie di sottoscrizione redditizie di tutte le dimensioni in Europa dovrebbero considerare la creazione di una captive.
      </p>
    ),
    content: (
      <>
        <p>
          Si stima che ci siano oltre 300 agenzie di sottoscrizione nel Regno Unito che trattengono parte del proprio rischio. Ma nell&apos;Europa continentale, le agenzie di sottoscrizione sono state generalmente più lente nel trattenere il rischio attraverso le captive. Per le agenzie di sottoscrizione che possono dimostrare un track record redditizio, ci sono sette buoni motivi per considerare la ritenzione del rischio attraverso una captive.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">1. Maggiore cattura del margine</h2>
        <p>
          Trattenere una parte del rischio consente all&apos;agenzia di sottoscrizione di partecipare direttamente ai profitti tecnici piuttosto che cedere tutto il valore ai fornitori di capacità.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">2. Maggiore controllo sulla capacità</h2>
        <p>
          Una captive riduce la dipendenza da assicuratori e riassicuratori terzi, migliorando la resilienza durante i mercati duri o i ritiri improvvisi di capacità.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">3. Allineamento degli incentivi di sottoscrizione</h2>
        <p>
          La ritenzione impone una disciplina di sottoscrizione più forte collegando direttamente la performance del portafoglio al capitale proprio dell&apos;agenzia di sottoscrizione a rischio.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">4. Maggiore potere negoziale con i carrier</h2>
        <p>
          Dimostrare di avere «pelle nel gioco» rafforza la credibilità e può portare a migliori condizioni di commissione, partecipazione agli utili e accordi di capacità a lungo termine. Infatti abbiamo visto alcuni clienti che sono riusciti ad aumentare la commissione semplicemente avendo la captive in essere – non hanno nemmeno preso una ritenzione inizialmente.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">5. Accesso ai mercati riassicurativi a condizioni migliori</h2>
        <p>
          Una captive può accedere direttamente alla riassicurazione in quota share o excess of loss, spesso a prezzi più efficienti rispetto ai soli accordi di fronting. Esiste ancora un arbitraggio di prezzo assicurazione/riassicurazione che vediamo spesso – specialmente quando l&apos;assicuratore incumbent è stato nel programma per molti anni.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">6. Diversificazione del portafoglio ed efficienza del capitale</h2>
        <p>
          Le captive ben strutturate (spesso domiciliate in giurisdizioni favorevoli all&apos;UE) consentono un utilizzo ottimizzato del capitale attraverso linee, geografie e cicli. Tradizionalmente Malta è un&apos;ottima sede per l&apos;accesso diretto all&apos;UE, ma richiede scala. Guernsey può operare utilizzando un assicuratore fronting e a volte può essere più conveniente dal punto di vista dei costi e del capitale per programmi più piccoli.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">7. Opzionalità strategica e scalabilità</h2>
        <p>
          Le captive consentono una sperimentazione controllata con nuovi prodotti, nicchie o geografie senza piena dipendenza da carrier esterni. Abbiamo bisogno di molte nuove start-up e l&apos;incubazione di nuovi prodotti nella propria captive aiuta a raccogliere dati e dimostra agli assicuratori un allineamento positivo degli interessi.
        </p>
      </>
    ),
    footer: 'Nel numero di marzo, approfondiremo gli aspetti pratici della costituzione di captive – e i meriti dei diversi domicili – per le agenzie di sottoscrizione europee.'
  },
  nl: {
    category: 'Bijdragend artikel',
    title: 'Zeven redenen om een captive te overwegen',
    author: 'Door Mark Elliott, Polo Insurance Managers',
    lead: (
      <p className="text-lg text-gray-800 leading-relaxed mb-8">
        De rol van herverzekeringscaptives is gegroeid in de capaciteitsstructuur van gevolmachtigd agenten in de Verenigde Staten en het Verenigd Koninkrijk. In het eerste van een reeks maandelijkse artikelen over captive management-kwesties benadrukt Mark Elliott, CEO van Polo Insurance Managers, gevestigd in Guernsey, de zeven belangrijkste redenen waarom winstgevende gevolmachtigd agenten van alle groottes in Europa zouden moeten overwegen een captive op te richten.
      </p>
    ),
    content: (
      <>
        <p>
          Er wordt geschat dat er meer dan 300 gevolmachtigd agenten in het VK zijn die een deel van hun eigen risico behouden. Maar in continentaal Europa zijn gevolmachtigd agenten over het algemeen trager geweest met het behouden van risico via captives. Voor gevolmachtigd agenten die een winstgevend trackrecord kunnen aantonen, zijn er zeven goede redenen om risicobehoud via een captive te overwegen.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">1. Verbeterde margevastlegging</h2>
        <p>
          Het behouden van een deel van het risico stelt de gevolmachtigd agent in staat om direct te participeren in verzekeringstechnische winsten in plaats van alle waarde af te staan aan capaciteitsverschaffers.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">2. Grotere controle over capaciteit</h2>
        <p>
          Een captive vermindert de afhankelijkheid van externe verzekeraars en herverzekeraars, wat de veerkracht verbetert tijdens harde markten of plotselinge capaciteitsterugtrekkingen.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">3. Afstemming van acceptatie-incentives</h2>
        <p>
          Behoud dwingt een sterkere acceptatiediscipline af door de portefeuilleprestaties direct te koppelen aan het eigen risicokapitaal van de gevolmachtigd agent.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">4. Verbeterde onderhandelingspositie met verzekeraars</h2>
        <p>
          Aangetoonde «skin in the game» versterkt de geloofwaardigheid en kan leiden tot betere provisievoorwaarden, winstdelingen en langetermijn capaciteitsovereenkomsten. We hebben inderdaad klanten gezien die erin slaagden hun provisie te verhogen alleen door de captive te hebben – ze namen aanvankelijk niet eens een behoud.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">5. Toegang tot herverzekeringsmarkten tegen betere voorwaarden</h2>
        <p>
          Een captive kan direct toegang krijgen tot quota share of excess of loss herverzekering, vaak tegen efficiëntere prijzen dan alleen via fronting-arrangementen. Er is nog steeds een verzekerings-/herverzekeringsarbitrage die we vaak zien – vooral wanneer de bestaande verzekeraar al jarenlang in het programma zit.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">6. Portefeuillediversificatie en kapitaalefficiëntie</h2>
        <p>
          Goed gestructureerde captives (vaak gedomicilieerd in EU-vriendelijke jurisdicties) maken geoptimaliseerd kapitaalgebruik mogelijk over branches, geografieën en cycli. Traditioneel is Malta een uitstekende locatie voor directe EU-toegang, maar vereist schaal. Guernsey kan opereren met een fronting-verzekeraar en kan soms kosteneffectiever zijn vanuit kosten- en kapitaalperspectief voor kleinere programma&apos;s.
        </p>

        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">7. Strategische optionaliteit en schaalbaarheid</h2>
        <p>
          Captives maken gecontroleerd experimenteren mogelijk met nieuwe producten, niches of geografieën zonder volledige afhankelijkheid van externe verzekeraars. We hebben veel nieuwe start-ups nodig en de incubatie van nieuwe producten in hun eigen captive helpt gegevens te verzamelen en toont verzekeraars een positieve afstemming van belangen.
        </p>
      </>
    ),
    footer: 'In de maart-editie zullen we dieper ingaan op de praktische aspecten van captive-oprichting – en de verdiensten van verschillende domicilies – voor Europese gevolmachtigd agenten.'
  }
};

export default function CaptivesArticle() {
  const { user, loading } = useUnifiedAuth();
  const router = useRouter();
  const locale = useLocale();
  const [currentLang, setCurrentLang] = useState(locale);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/member-portal/bulletin/february-2026/captives');
    }
  }, [user, loading, router]);

  useEffect(() => {
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
        <div className="relative h-[45vh] min-h-[360px] overflow-hidden">
          <Image
            src="/consideration.jpg"
            alt="Strategic considerations"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-4xl mx-auto px-6 pb-10 w-full">
              <Link
                href="/member-portal/bulletin/february-2026"
                className="inline-flex items-center text-white/70 hover:text-white text-sm mb-4"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                February 2026 Edition
              </Link>
              <p className="text-fase-gold text-xs font-semibold uppercase tracking-widest mb-3">{t.category}</p>
              <h1 className="text-3xl md:text-4xl font-noto-serif font-bold text-white leading-snug mb-3">
                {t.title}
              </h1>
              <p className="text-white/70">{t.author}</p>
            </div>
          </div>
        </div>

        {/* Language Selector */}
        <div className="bg-gray-50 border-b border-gray-200 py-4">
          <div className="max-w-4xl mx-auto px-6">
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
        <article className="max-w-4xl mx-auto px-6 py-10">

          {/* Lead paragraph */}
          {t.lead}

          {/* Body */}
          <div className="text-base text-gray-700 leading-relaxed space-y-5">
            {t.content}
          </div>

          {/* Footer note */}
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 italic leading-relaxed">
              {t.footer}
            </p>
          </div>

          {/* Back link */}
          <div className="mt-8">
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
