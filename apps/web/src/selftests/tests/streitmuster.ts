import type { SelfTest } from '../types'

/**
 * Wie streitet ihr? – dimensionaler Test (concern-Polarität: hoch = mehr Anzeichen).
 * Die „vier Reiter" nach Gottman: Kritik, Verachtung, Rechtfertigung, Mauern. Jede
 * Dimension nennt das Gegenmittel. Misst Muster im Streit, nicht Schuld. Nicht-diagnostisch.
 */
export const streitmuster: SelfTest = {
  slug: 'streitmuster',
  category: 'beziehung',
  title: 'Wie streitet ihr? Die vier Reiter im Test',
  teaser:
    'Kritik, Verachtung, Rechtfertigung, Mauern – die vier Muster, die Beziehungen zermürben. Finde heraus, welche bei euch mitreiten, und was hilft.',
  description:
    'Dieser Selbsttest ordnet euer Streitverhalten anhand der „vier Reiter" nach dem Paarforscher John Gottman ein: Kritik, Verachtung, Rechtfertigung und Mauern (Rückzug). Er misst Muster – nicht Schuld – und nennt zu jedem Reiter das passende Gegenmittel. Das Ergebnis kannst du anschließend mit Echo besprechen. Ohne Diagnose.',
  duration: '8–11 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  intro:
    'Streit an sich ist kein Problem – jedes Paar streitet. Entscheidend ist das Wie. Der Paarforscher John Gottman nennt vier Muster, die eine Beziehung auf Dauer zermürben: Kritik, Verachtung, Rechtfertigung und Mauern. Dieser Test schaut, welche davon bei euch auftauchen – nicht, wer schuld ist. Antworte danach, wie es in euren Streits wirklich zugeht, nicht wie es sein sollte.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, welche Streitmuster bei euch am stärksten mitreiten. Welcher typische Streit ist dir beim Ausfüllen immer wieder in den Kopf gekommen?',
  },
  dimensions: [
    {
      key: 'kritik',
      name: 'Kritik',
      description: 'Aus einem Problem wird ein Angriff auf den Charakter.',
      bands: [
        { min: 0, label: 'Kaum ein Thema', tone: 'good', text: 'Ihr sprecht Probleme meist als Probleme an – „mich stört X, ich brauche Y" statt „du bist X". Dieser sanfte Einstieg ist genau das Gegenmittel gegen Kritik. Stark.' },
        { min: 40, label: 'Reitet mit', tone: 'watch', text: 'Aus konkreten Anliegen werden öfter Vorwürfe („immer", „nie", „typisch du"). Gegenmittel: der sanfte Einstieg – über dich sprechen und um etwas bitten, statt anzuklagen. „Ich fühle mich allein, wenn … Ich wünsche mir …"' },
        { min: 65, label: 'Vorne weg', tone: 'alert', text: 'Sehr oft wird aus einem Problem ein Angriff auf die Person. Dauerkritik nagt am Selbstwert beider. Das Gegenmittel bleibt derselbe kleine, große Schritt: Beobachtung und Bedürfnis benennen – nicht den Charakter.' },
      ],
    },
    {
      key: 'verachtung',
      name: 'Verachtung',
      description: 'Spott, Sarkasmus, Herabsetzung – das schädlichste Muster.',
      bands: [
        { min: 0, label: 'Nicht dabei', tone: 'good', text: 'Auch im Streit bleibt ihr auf Augenhöhe, ohne Spott oder Herabsetzung. Das ist wertvoll: Verachtung gilt als das zerstörerischste Muster – und bei euch reitet es nicht mit.' },
        { min: 35, label: 'Zeigt sich', tone: 'watch', text: 'Sarkasmus, Augenrollen oder ein herablassender Ton schleichen sich ein. Nimm das ernst – Verachtung ist der stärkste Vorbote für Distanz. Gegenmittel: aktiv Wertschätzung und Respekt pflegen, gerade im Alltag zwischen den Konflikten.' },
        { min: 55, label: 'Deutlich da', tone: 'alert', text: 'Herabsetzung, Spott oder Überheblichkeit gehören zu euren Streits. Von allen vier Reitern ist dieser der gefährlichste – er sagt „ich stehe über dir". Hier lohnt sich Unterstützung besonders; ein respektvoller Grundton ist die Basis für alles andere.' },
      ],
    },
    {
      key: 'rechtfertigung',
      name: 'Rechtfertigung',
      description: 'Gegenangriff und Verteidigung statt Verantwortung.',
      bands: [
        { min: 0, label: 'Selten', tone: 'good', text: 'Ihr könnt einen eigenen Anteil einräumen, ohne euch sofort zu verteidigen. Dieses „du hast recht, an dem Punkt lag ich daneben" entwaffnet fast jeden Streit.' },
        { min: 40, label: 'Reitet mit', tone: 'watch', text: 'Auf Kritik folgt oft Gegenangriff oder „ja, aber du …". Verteidigung schiebt die Verantwortung hin und her, ohne dass jemand ankommt. Gegenmittel: einen – auch kleinen – eigenen Anteil übernehmen, statt aufzurechnen.' },
        { min: 65, label: 'Fester Reflex', tone: 'alert', text: 'Verantwortung für den eigenen Anteil zu übernehmen, gelingt kaum – jeder verteidigt sich, keiner kommt an. So drehen sich Streits endlos. Der Ausweg ist unbequem und wirksam: bei sich anfangen.' },
      ],
    },
    {
      key: 'mauern',
      name: 'Mauern & Rückzug',
      description: 'Dichtmachen, Schweigen, Weggehen – innerlich nicht mehr erreichbar.',
      bands: [
        { min: 0, label: 'Ihr bleibt im Kontakt', tone: 'good', text: 'Auch wenn es heiß wird, bleibt ihr ansprechbar oder macht eine bewusste Pause und kommt wieder. Genau das ist das Gegenmittel gegen Mauern.' },
        { min: 40, label: 'Kommt vor', tone: 'watch', text: 'Bei Belastung macht einer von euch dicht, schweigt oder geht – oft aus Überforderung, nicht aus Bosheit. Gegenmittel: die Überflutung erkennen, eine echte Pause vereinbaren („ich brauche 20 Minuten, dann rede ich weiter") – und wirklich zurückkommen.' },
        { min: 65, label: 'Häufig', tone: 'alert', text: 'Dichtmachen und langes Schweigen prägen eure Konflikte; einer ist innerlich nicht mehr erreichbar. Das fühlt sich für den anderen wie Verlassenwerden an. Selbstberuhigung und verbindliche Wiederannäherung sind hier der Schlüssel.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Ihr streitet im Kern fair', tone: 'good', text: 'Die vier Reiter sind bei euch höchstens seltene Gäste. Ihr könnt aneinandergeraten und wieder zueinanderfinden – das ist die eigentliche Kunst. Achte darauf, gerade in stressigen Phasen respektvoll zu bleiben.' },
    { min: 38, label: 'Einige Reiter reiten mit', tone: 'watch', text: 'Unter Druck tauchen mehrere der schädlichen Muster auf. Das ist normal und veränderbar: Muster zu benennen ist der erste Schritt, die Gegenmittel bewusst einzuüben der zweite. Schau dir an, welcher Reiter bei euch am lautesten ist.' },
    { min: 58, label: 'Die vier Reiter sind Stammgäste', tone: 'alert', text: 'Mehrere zermürbende Muster prägen eure Konflikte regelmäßig – besonders ernst, wenn Verachtung dabei ist. Das heißt nicht, dass eure Beziehung verloren ist; aber ihr dreht euch in Mustern, aus denen ihr allein schwer herauskommt. Paarberatung kann hier viel bewegen.' },
  ],
  questions: [
    // Kritik
    { id: 'st1', type: 'scale', section: 'Wenn ihr streitet', dimension: 'kritik', text: 'In unseren Streits fallen Sätze wie „immer machst du …" oder „nie denkst du an …".' },
    { id: 'st2', type: 'scale', section: 'Wenn ihr streitet', dimension: 'kritik', text: 'Aus einem konkreten Problem wird schnell ein Vorwurf gegen den Charakter („du bist eben …").' },
    { id: 'st3', type: 'scale', section: 'Wenn ihr streitet', dimension: 'kritik', text: 'Ich beginne schwierige Themen oft mit einem Vorwurf, statt zu sagen, was ich brauche.' },
    {
      id: 'st4', type: 'single', section: 'Wenn ihr streitet', dimension: 'kritik',
      text: 'Wenn mich etwas stört, klingt mein erster Satz meistens so:',
      options: [
        { label: '„Mir geht es gerade so … ich wünsche mir …"', value: 0 },
        { label: 'Sachlich, aber mit einem leisen Vorwurf.', value: 2 },
        { label: '„Du hast schon wieder …"', value: 3 },
        { label: '„Typisch – du bist einfach …"', value: 4 },
      ],
    },
    // Verachtung
    { id: 'st5', type: 'scale', section: 'Der Ton', dimension: 'verachtung', text: 'Es fallen abwertende Bemerkungen, Spott oder Sarkasmus.' },
    { id: 'st6', type: 'scale', section: 'Der Ton', dimension: 'verachtung', text: 'Augenrollen, genervtes Seufzen oder ein herablassender Ton gehören dazu.' },
    { id: 'st7', type: 'scale', section: 'Der Ton', dimension: 'verachtung', text: 'Einer von uns behandelt den anderen zeitweise von oben herab.' },
    { id: 'st8', type: 'scale', section: 'Der Ton', dimension: 'verachtung', text: 'Nach Streits fühle ich mich beschämt oder klein gemacht.' },
    // Rechtfertigung
    { id: 'st9', type: 'scale', section: 'Die Reaktion', dimension: 'rechtfertigung', text: 'Auf Kritik folgt bei uns Gegenangriff oder „ja, aber du …".' },
    { id: 'st10', type: 'scale', section: 'Die Reaktion', dimension: 'rechtfertigung', text: 'Einen eigenen Anteil einzuräumen, fällt in unseren Streits schwer.' },
    { id: 'st11', type: 'scale', section: 'Die Reaktion', dimension: 'rechtfertigung', text: 'Wir erklären und verteidigen uns, statt einander zuzuhören.' },
    {
      id: 'st12', type: 'single', section: 'Die Reaktion', dimension: 'rechtfertigung',
      text: 'Wenn mein Gegenüber mir einen Vorwurf macht, ist mein erster Impuls …',
      options: [
        { label: 'zuzuhören und zu schauen, was dran ist.', value: 0 },
        { label: 'mich zu erklären.', value: 2 },
        { label: 'sofort zurückzuschießen („und du erst …").', value: 4 },
        { label: 'mich als das eigentliche Opfer zu fühlen.', value: 3 },
      ],
    },
    // Mauern
    { id: 'st13', type: 'scale', section: 'Der Rückzug', dimension: 'mauern', text: 'Bei Streit macht einer von uns dicht, schweigt oder geht raus.' },
    { id: 'st14', type: 'scale', section: 'Der Rückzug', dimension: 'mauern', text: 'Ich blocke ab und bin innerlich nicht mehr erreichbar.' },
    { id: 'st15', type: 'scale', section: 'Der Rückzug', dimension: 'mauern', text: 'Nach einem harten Wort herrscht bei uns langes, eisiges Schweigen.' },
    {
      id: 'st16', type: 'single', section: 'Der Rückzug', dimension: 'mauern',
      text: 'Wenn es mir im Streit zu viel wird …',
      options: [
        { label: 'sage ich das und mache eine kurze Pause, komme aber wieder.', value: 0 },
        { label: 'werde ich leiser und ziehe mich etwas zurück.', value: 2 },
        { label: 'mache ich zu und rede tagelang nicht darüber.', value: 4 },
        { label: 'gehe ich raus und lasse die Situation offen stehen.', value: 3 },
      ],
    },
    // Freitext
    { id: 'st_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Wie findet ihr nach einem Streit wieder zueinander – wenn überhaupt?' },
    { id: 'st_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Welcher der vier Reiter kommt eher von dir, welcher eher vom Gegenüber – und was löst ihn meistens aus?' },
  ],
  disclaimer:
    'Die „vier Reiter" sind ein Modell aus der Paarforschung, keine Diagnose. Der Test misst Muster in euren Konflikten, nicht Schuld. Er ersetzt keine Paarberatung – kann aber ein guter Anfang für ein Gespräch sein.',
}
