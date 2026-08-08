import type { SelfTest } from '../types'

/**
 * Verlierst du dich? – dimensionaler Test (concern-Polarität: hoch = mehr Selbstaufgabe).
 * Fünf Dimensionen der Selbst-Aufgabe/Selbst-Verlust in Beziehungen. Nicht beschämend,
 * ressourcenorientiert. Streng nicht-diagnostisch: Anhaltspunkte, keine Urteile.
 */
export const verliereIchMich: SelfTest = {
  slug: 'verliere-ich-mich',
  category: 'therapie',
  title: 'Verlierst du dich in deiner Beziehung?',
  teaser:
    'Wenn du immer nachgibst, dich anpasst und irgendwann nicht mehr weißt, was du selbst willst: fünf Bereiche zeigen, wie sehr du dich zurücknimmst.',
  description:
    'Dieser Selbsttest zeigt dir in fünf Bereichen, wie stark du dich in deiner Beziehung selbst zurücknimmst – von Selbstaufgabe über fehlende Grenzen bis zum Verlust eigener Freundschaften und Interessen. Kein Vorwurf, sondern ein liebevoller, ehrlicher Blick auf dich. Das Ergebnis kannst du anschließend mit Echo besprechen. Ohne Diagnose.',
  duration: '9–12 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  intro:
    'Sich für einen geliebten Menschen zurückzunehmen, ist normal und schön – bis es zu viel wird und du dich selbst dabei verlierst. Dieser Test schaut nicht auf dein Gegenüber, sondern auf dich: Wie viel Raum nimmst du dir noch? Es geht nicht darum, dir Egoismus zu verordnen, sondern darum, dich selbst wieder wahrzunehmen. Antworte ehrlich – niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, in welchen Bereichen du dich am stärksten zurücknimmst. An welcher Stelle hast du beim Ausfüllen gedacht „stimmt, das mache ich ständig"?',
  },
  dimensions: [
    {
      key: 'selbstaufgabe',
      name: 'Selbstaufgabe',
      description: 'Wie oft deine eigenen Bedürfnisse ganz hinten anstehen.',
      bands: [
        { min: 0, label: 'Du bist präsent', tone: 'good', text: 'Du gibst nach, wenn es dir wichtig ist – aber du behältst dich dabei. Deine Bedürfnisse haben einen festen Platz, auch neben denen deines Gegenübers.' },
        { min: 40, label: 'Du trittst zurück', tone: 'watch', text: 'Oft kommen deine Wünsche zuletzt, fast automatisch. Zu prüfen, wann du „ist mir egal" sagst, obwohl es dir nicht egal ist, wäre ein wichtiger Schritt zurück zu dir.' },
        { min: 65, label: 'Du verschwindest', tone: 'alert', text: 'Deine eigenen Bedürfnisse tauchen kaum noch auf – vielleicht spürst du sie selbst kaum. Sich so weit aufzugeben, ist keine Liebe, sondern ein langsames Verschwinden. Du darfst wieder vorkommen.' },
      ],
    },
    {
      key: 'grenzen',
      name: 'Fehlende Grenzen',
      description: 'Wie schwer es dir fällt, Nein zu sagen und dich abzugrenzen.',
      bands: [
        { min: 0, label: 'Du hältst Grenzen', tone: 'good', text: 'Du kannst Nein sagen und tust es, wenn es nötig ist – auch wenn es unbequem ist. Deine Grenzen sind für dich verhandelbar, aber nicht unsichtbar.' },
        { min: 40, label: 'Grenzen verschwimmen', tone: 'watch', text: 'Nein zu sagen fällt dir schwer; oft sagst du Ja und ärgerst dich danach. Ein Nein ist ein vollständiger Satz – das darfst du üben, ohne dich schuldig zu fühlen.' },
        { min: 65, label: 'Grenzenlos verfügbar', tone: 'alert', text: 'Du bist fast immer verfügbar und kannst dich kaum abgrenzen; Schuldgefühle übernehmen, sobald du an dich denkst. Ohne Grenzen verschwimmt, wo du aufhörst und die/der andere anfängt – und du gehst darin unter.' },
      ],
    },
    {
      key: 'fremdbestimmung',
      name: 'Fremdbestimmtes Befinden',
      description: 'Wie sehr dein Wohlbefinden von der Stimmung und Zustimmung des Gegenübers abhängt.',
      bands: [
        { min: 0, label: 'In dir verankert', tone: 'good', text: 'Es geht dir besser, wenn es harmonisch ist – klar. Aber dein Wert und dein Boden hängen nicht an der Laune oder dem Lob deines Gegenübers.' },
        { min: 40, label: 'Nach außen ausgerichtet', tone: 'watch', text: 'Deine Stimmung schwankt stark mit der deines Gegenübers; ein Lob hebt dich, ein kühler Ton drückt dich. Deinen Wert wieder in dir selbst zu verankern, wäre ein Gewinn an Freiheit.' },
        { min: 65, label: 'Von außen gesteuert', tone: 'alert', text: 'Dein Selbstwert hängt fast vollständig an der Zustimmung deines Gegenübers – du liest ständig seine/ihre Stimmung, um zu wissen, wie es dir gehen darf. Das ist erschöpfend und macht dich sehr verletzlich.' },
      ],
    },
    {
      key: 'ueberverantwortung',
      name: 'Über-Verantwortung',
      description: 'Wie sehr du dich für die Gefühle und das Glück des Gegenübers zuständig fühlst.',
      bands: [
        { min: 0, label: 'Klar getrennt', tone: 'good', text: 'Du bist zugewandt, aber du weißt: Für die Gefühle deines Gegenübers ist es selbst verantwortlich. Du musst nicht jede Laune auffangen.' },
        { min: 40, label: 'Du fängst auf', tone: 'watch', text: 'Du fühlst dich oft verantwortlich, die Stimmung zu retten oder Konflikte zu glätten, bevor sie entstehen. Diese Dauer-Fürsorge (auch „Fawning" genannt) kostet dich viel – und nimmt dem Gegenüber die eigene Verantwortung.' },
        { min: 65, label: 'Dauer-Manager', tone: 'alert', text: 'Du steuerst das emotionale Klima ständig, verbiegst dich, um Ausbrüche oder Enttäuschung zu vermeiden, und machst dich für alles verantwortlich. Das ist ein schweres Amt, das dir niemand geben durfte – du darfst es niederlegen.' },
      ],
    },
    {
      key: 'verlust_eigenes',
      name: 'Verlust des Eigenen',
      description: 'Wie viel von deinem eigenen Leben – Freunde, Interessen, Ich – noch da ist.',
      bands: [
        { min: 0, label: 'Dein Leben lebt', tone: 'good', text: 'Du hast weiterhin dein eigenes Leben: Freundschaften, Interessen, Rückzugsorte. Diese eigene Welt gibt dir Halt – unabhängig von der Beziehung.' },
        { min: 40, label: 'Es schrumpft', tone: 'watch', text: 'Freundschaften und Interessen sind in den Hintergrund gerückt; die Beziehung nimmt fast allen Raum ein. Dir dein eigenes Leben Stück für Stück zurückzuholen, stärkt auch die Beziehung.' },
        { min: 65, label: 'Fast verschwunden', tone: 'alert', text: 'Dein eigenes Leben ist weitgehend verschwunden – du weißt kaum noch, wer du ohne die Beziehung bist. Diese Enge tut niemandem gut; sie ist ein deutliches Zeichen, dir selbst wieder Raum zu geben. Wenn dieser Rückzug von außen gefördert wurde, ist das ernst zu nehmen.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Du bleibst bei dir', tone: 'good', text: 'Du nimmst dich für die Beziehung zurück, ohne dich zu verlieren. Deine Bedürfnisse, Grenzen und dein eigenes Leben haben weiterhin Platz. Das ist eine gute Balance – halte sie im Blick.' },
    { min: 40, label: 'Du neigst dich stark', tone: 'watch', text: 'In mehreren Bereichen stellst du dich hinten an, oft ohne es zu merken. Das ist kein Grund für Selbstvorwürfe – aber eine Einladung, dich selbst wieder wichtiger zu nehmen, bevor der Groll oder die Leere wächst.' },
    { min: 62, label: 'Du verlierst dich', tone: 'alert', text: 'Über viele Bereiche hinweg gibst du dich selbst auf. Sich so weit zu verlieren, ist zutiefst erschöpfend – und selten nur eine Charakterfrage; oft steckt eine Dynamik dahinter, die das verstärkt. Du verdienst es, wieder vorzukommen, und darfst dir dafür Unterstützung holen.' },
  ],
  questions: [
    // Selbstaufgabe
    { id: 'vm1', type: 'scale', section: 'Deine Bedürfnisse', dimension: 'selbstaufgabe', text: 'Meine eigenen Wünsche stelle ich hinten an, um es meinem Gegenüber recht zu machen.' },
    { id: 'vm2', type: 'scale', section: 'Deine Bedürfnisse', dimension: 'selbstaufgabe', text: 'Ich sage „ist mir egal", obwohl es mir eigentlich nicht egal ist.' },
    { id: 'vm3', type: 'scale', section: 'Deine Bedürfnisse', dimension: 'selbstaufgabe', text: 'Ich weiß oft selbst nicht mehr, was ich eigentlich will oder brauche.' },
    { id: 'vm4', type: 'scale', section: 'Deine Bedürfnisse', dimension: 'selbstaufgabe', text: 'Ich merke, was ich brauche, und spreche es aus.', reverse: true },
    // Fehlende Grenzen
    { id: 'vm5', type: 'scale', section: 'Deine Grenzen', dimension: 'grenzen', text: 'Nein zu sagen fällt mir sehr schwer.' },
    { id: 'vm6', type: 'scale', section: 'Deine Grenzen', dimension: 'grenzen', text: 'Ich sage Ja und ärgere mich hinterher, dass ich nicht Nein gesagt habe.' },
    { id: 'vm7', type: 'scale', section: 'Deine Grenzen', dimension: 'grenzen', text: 'Wenn ich an mich denke oder eine Grenze setze, bekomme ich sofort ein schlechtes Gewissen.' },
    {
      id: 'vm8', type: 'single', section: 'Deine Grenzen', dimension: 'grenzen',
      text: 'Wenn mein Gegenüber etwas möchte und ich eigentlich nicht …',
      options: [
        { label: 'sage ich freundlich, aber klar Nein.', value: 0 },
        { label: 'sage ich meist Nein, mit schlechtem Gewissen.', value: 1 },
        { label: 'gebe ich nach kurzem Zögern nach.', value: 3 },
        { label: 'tue ich es, ohne dass mein Nein überhaupt eine Chance hatte.', value: 4 },
      ],
    },
    // Fremdbestimmtes Befinden
    { id: 'vm9', type: 'scale', section: 'Dein Wohlbefinden', dimension: 'fremdbestimmung', text: 'Meine Stimmung hängt stark davon ab, wie mein Gegenüber gerade drauf ist.' },
    { id: 'vm10', type: 'scale', section: 'Dein Wohlbefinden', dimension: 'fremdbestimmung', text: 'Ein Lob oder ein kühler Ton meines Gegenübers entscheidet, wie viel ich mir selbst wert bin.' },
    { id: 'vm11', type: 'scale', section: 'Dein Wohlbefinden', dimension: 'fremdbestimmung', text: 'Ich beobachte ständig die Stimmung meines Gegenübers, um zu wissen, woran ich bin.' },
    { id: 'vm12', type: 'scale', section: 'Dein Wohlbefinden', dimension: 'fremdbestimmung', text: 'Mein Selbstwert ruht in mir – unabhängig von der Zustimmung meines Gegenübers.', reverse: true },
    // Über-Verantwortung
    { id: 'vm13', type: 'scale', section: 'Verantwortung', dimension: 'ueberverantwortung', text: 'Ich fühle mich dafür verantwortlich, dass es meinem Gegenüber gut geht.' },
    { id: 'vm14', type: 'scale', section: 'Verantwortung', dimension: 'ueberverantwortung', text: 'Ich versuche, Konflikte oder schlechte Laune zu verhindern, bevor sie überhaupt entstehen.' },
    { id: 'vm15', type: 'scale', section: 'Verantwortung', dimension: 'ueberverantwortung', text: 'Wenn mein Gegenüber schlecht gelaunt ist, suche ich zuerst die Schuld bei mir.' },
    {
      id: 'vm16', type: 'single', section: 'Verantwortung', dimension: 'ueberverantwortung',
      text: 'Wenn es meinem Gegenüber schlecht geht, ist mein erster Impuls …',
      options: [
        { label: 'da zu sein, ohne mich verantwortlich zu fühlen.', value: 0 },
        { label: 'zu helfen – manchmal etwas zu viel.', value: 2 },
        { label: 'es sofort in Ordnung bringen zu müssen.', value: 3 },
        { label: 'Anspannung, als hinge mein eigenes Wohl davon ab.', value: 4 },
      ],
    },
    // Verlust des Eigenen
    { id: 'vm17', type: 'scale', section: 'Dein eigenes Leben', dimension: 'verlust_eigenes', text: 'Freundschaften und Kontakte sind seit der Beziehung deutlich weniger geworden.' },
    { id: 'vm18', type: 'scale', section: 'Dein eigenes Leben', dimension: 'verlust_eigenes', text: 'Hobbys und Interessen, die mir wichtig waren, sind eingeschlafen.' },
    { id: 'vm19', type: 'scale', section: 'Dein eigenes Leben', dimension: 'verlust_eigenes', text: 'Ich weiß kaum noch, wer ich außerhalb dieser Beziehung bin.' },
    { id: 'vm20', type: 'scale', section: 'Dein eigenes Leben', dimension: 'verlust_eigenes', text: 'Ich habe eigene Rückzugsorte und Menschen, die mir guttun.', reverse: true },
    {
      id: 'vm21', type: 'single', section: 'Dein eigenes Leben', dimension: 'verlust_eigenes',
      text: 'Wenn ich an einen ganzen Tag nur für mich denke …',
      options: [
        { label: 'freue ich mich – ich weiß, was ich damit anfange.', value: 0 },
        { label: 'ist das schön, kommt aber selten vor.', value: 2 },
        { label: 'fühle ich mich fast schuldig oder unruhig.', value: 3 },
        { label: 'wüsste ich gar nicht mehr, was ich mit mir anfangen soll.', value: 4 },
      ],
    },
    // Freitext
    { id: 'vm_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was hast du früher gern getan oder ausgemacht, das dir heute fehlt?' },
    { id: 'vm_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was wäre ein erster, kleiner Schritt zurück zu dir – etwas, das du dir diese Woche gönnen könntest?' },
  ],
  disclaimer:
    'Dieser Test bewertet nicht dein Gegenüber und macht dich zu nichts. Er lädt dich ein, dich selbst wieder wahrzunehmen. Starke Selbstaufgabe kann viele Ursachen haben – und tritt manchmal in Dynamiken auf, die sie verstärken. Er ersetzt keine Beratung oder Therapie.',
}
