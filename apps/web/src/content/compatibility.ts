// Datengrundlage der Kompatibilitäts-Matrix (/kompatibilitaet).
// Vier Bindungstypen (Attachment) + alle 10 Paarungen. Nicht-diagnostisch:
// Modelle und Tendenzen, keine Etiketten. Deutungsangebot, kein Urteil.

export type AttachType = 'sicher' | 'aengstlich' | 'vermeidend' | 'aengstlich_vermeidend'

export const ATTACH_ORDER: AttachType[] = ['sicher', 'aengstlich', 'vermeidend', 'aengstlich_vermeidend']

export interface TypeProfile {
  key: AttachType
  name: string
  tagline: string
  essence: string
  inLove: string
  fear: string
  needs: string
  inConflict: string
  strength: string
  growth: string
}

export const TYPES: Record<AttachType, TypeProfile> = {
  sicher: {
    key: 'sicher',
    name: 'Sicher gebunden',
    tagline: 'Nähe und Eigenständigkeit gehen zusammen.',
    essence:
      'Sicher gebundene Menschen tragen ein Grundvertrauen in sich: Nähe ist erreichbar, und Abstand bedeutet keine Bedrohung. Sie können sich einlassen, ohne sich zu verlieren, und allein sein, ohne sich verlassen zu fühlen.',
    inLove:
      'Sie zeigen Zuneigung direkt, sprechen Bedürfnisse offen an und können die ihres Gegenübers hören, ohne sie als Angriff zu lesen. Verbindlichkeit ist für sie eher Geschenk als Gefahr.',
    fear: 'Am ehesten: dauerhaft nicht gesehen oder respektiert zu werden – aber ohne die ständige Alarmbereitschaft der unsicheren Stile.',
    needs: 'Ehrlichkeit, Verlässlichkeit und Gegenseitigkeit. Sie brauchen kein ständiges Bespielen, sondern gelebte Zuverlässigkeit.',
    inConflict:
      'Sie bleiben eher im Gespräch, können pausieren ohne zu strafen, und kehren zur Reparatur zurück. Streit ist für sie kein Beziehungsende.',
    strength: 'Sie wirken regulierend – ihr ruhiges Nervensystem kann ein unsichereres Gegenüber mitberuhigen.',
    growth:
      'Auch ein sicherer Stil gerät in belastenden Beziehungen ins Wanken. Wachstum heißt hier: die eigene Sicherheit nicht kleinreden, wenn ein Gegenüber sie über Monate untergräbt.',
  },
  aengstlich: {
    key: 'aengstlich',
    name: 'Ängstlich gebunden',
    tagline: 'Sehnsucht nach Nähe – und Angst, sie zu verlieren.',
    essence:
      'Nähe ist ängstlich gebundenen Menschen enorm wichtig, fast lebensnotwendig – und genau deshalb löst die Angst vor Verlust schnell großen Stress aus. Sie lesen feine Signale, manchmal zu viele.',
    inLove:
      'Sie geben viel, kümmern sich, suchen Verbindung – und neigen dazu, sich anzupassen oder zu klammern, um die Beziehung zu sichern. Zuwendung beruhigt sie tief, Ausbleiben beunruhigt sie schnell.',
    fear: 'Verlassen, ersetzt oder „zu viel“ zu sein. Ein ausbleibender Rückruf kann sich anfühlen wie das Ende.',
    needs: 'Verlässliche Zuwendung, Beruhigung in der Unsicherheit und die Erfahrung, dass Bleiben auch bei Konflikt möglich ist.',
    inConflict:
      'Sie protestieren gegen Distanz – fordern, klammern, werden laut oder flehend. Hinter dem Protest steht: „Bist du noch da?“',
    strength: 'Große Beziehungsbereitschaft, Wärme, Ausdauer im Dranbleiben. Sie kämpfen für Nähe.',
    growth:
      'Zu lernen, dass sie auch allein sicher sind – und dem eigenen Wert nicht von der Reaktion des anderen abhängig zu machen. Selbstberuhigung ist ihr Schlüssel.',
  },
  vermeidend: {
    key: 'vermeidend',
    name: 'Vermeidend gebunden',
    tagline: 'Unabhängigkeit fühlt sich sicherer an als Nähe.',
    essence:
      'Vermeidend gebundene Menschen schätzen ihre Eigenständigkeit hoch. Wird Nähe zu intensiv oder fordernd, entsteht der Drang nach Abstand – nicht aus Kälte, sondern weil zu viel Nähe sich unsicher anfühlt.',
    inLove:
      'Sie zeigen Zuneigung eher über Taten als über Worte, brauchen Rückzugsräume und reagieren empfindlich auf das Gefühl, vereinnahmt zu werden. Verbindlichkeit kann Enge auslösen.',
    fear: 'Kontrolliert, vereinnahmt oder abhängig zu werden – und die eigene Autonomie zu verlieren.',
    needs: 'Freiraum, Respekt vor Grenzen und ein Tempo, das sie nicht überrollt. Druck erzeugt Rückzug.',
    inConflict:
      'Sie machen dicht, ziehen sich zurück, deaktivieren das Gefühl. „Ich brauch das nicht“ ist oft Schutz, nicht Wahrheit.',
    strength: 'Verlässliche Eigenständigkeit, Ruhe, Handlungsfähigkeit unter Druck. Sie überfluten nicht.',
    growth:
      'Zu erlauben, gebraucht zu werden, ohne sich ausgeliefert zu fühlen – und Rückzug anzukündigen statt zu verschwinden. Nähe in kleinen Schritten.',
  },
  aengstlich_vermeidend: {
    key: 'aengstlich_vermeidend',
    name: 'Ängstlich-vermeidend',
    tagline: 'Komm näher – nein, geh weg.',
    essence:
      'Der ängstlich-vermeidende (auch: desorganisierte) Stil trägt beides in sich: die tiefe Sehnsucht nach Nähe und die Angst vor ihr. Genau die Person, die Halt geben soll, löst zugleich Alarm aus.',
    inLove:
      'Nähe wird gesucht und dann, wenn sie da ist, als bedrohlich erlebt und abgewehrt. Das erzeugt ein Auf und Ab, das für beide Seiten verwirrend ist – oft am stärksten in intensiven, bedeutsamen Beziehungen.',
    fear: 'Sowohl verlassen zu werden als auch verletzt zu werden, wenn man sich einlässt. Vertrauen fühlt sich riskant an.',
    needs: 'Sicherheit, Vorhersehbarkeit und viel Geduld. Kein Drama, keine plötzlichen Brüche – verlässliche, ruhige Präsenz.',
    inConflict:
      'Wechsel aus Klammern und Wegstoßen, oft heftig. Erst „verlass mich nicht“, dann „lass mich in Ruhe“ – innerhalb kurzer Zeit.',
    strength: 'Große emotionale Tiefe und Empathie für widersprüchliche Gefühle – wenn Sicherheit vorhanden ist.',
    growth:
      'Häufig hilft (fach-)therapeutische Begleitung, um alte Schutzmuster zu lösen. Kleine, sichere Beziehungserfahrungen bauen nach und nach Vertrauen auf.',
  },
}

export type Rating = 'stark' | 'gut' | 'gemischt' | 'herausfordernd' | 'intensiv'

export const RATING_LABEL: Record<Rating, string> = {
  stark: 'Tragfähig',
  gut: 'Gut möglich',
  gemischt: 'Gemischt',
  herausfordernd: 'Herausfordernd',
  intensiv: 'Intensiv',
}

export interface Pairing {
  a: AttachType
  b: AttachType
  rating: Rating
  headline: string
  dynamic: string
  draw: string
  friction: string
  forA: string
  forB: string
  growth: string
}

// Kanonische Reihenfolge: a-Index <= b-Index (siehe ATTACH_ORDER).
export const PAIRINGS: Pairing[] = [
  {
    a: 'sicher', b: 'sicher', rating: 'stark',
    headline: 'Zwei ruhige Nervensysteme',
    dynamic: 'Beide vertrauen darauf, dass Nähe hält und Abstand nichts zerstört. Konflikte werden eher besprochen als ausgetragen, Reparatur ist selbstverständlich.',
    draw: 'Verlässlichkeit auf beiden Seiten. Man muss nicht raten, woran man ist – und kann Energie in die Beziehung statt in ihre Absicherung stecken.',
    friction: 'Am ehesten Bequemlichkeit: Weil so wenig knirscht, kann Wachstum einschlafen. Reibung entsteht eher an äußeren Themen als an der Bindung selbst.',
    forA: 'Ruht euch nicht aus. Sucht bewusst Tiefe und neue gemeinsame Erfahrungen, damit die Sicherheit lebendig bleibt.',
    forB: 'Dasselbe gilt für dich: Sicherheit ist ein Fundament, kein Ziel. Bleibt neugierig aufeinander.',
    growth: 'Gemeinsam über die Komfortzone hinauswachsen – Projekte, Verletzlichkeit, große Fragen.',
  },
  {
    a: 'sicher', b: 'aengstlich', rating: 'gut',
    headline: 'Der Fels und die Sehnsucht',
    dynamic: 'Die verlässliche Präsenz des sicheren Parts kann die Verlustangst des ängstlichen Parts nach und nach beruhigen. Das ist eine der heilsamsten Paarungen für unsichere Bindung.',
    draw: 'Der ängstliche Part erlebt endlich, dass Bleiben auch bei Konflikt möglich ist. Der sichere Part fühlt sich gebraucht und wertgeschätzt.',
    friction: 'Wenn die Zuwendung einmal ausbleibt, springt die Angst trotzdem an. Der sichere Part kann sich zeitweise als „Dauer-Beruhiger“ erleben.',
    forA: 'Deine Konstanz wirkt – auch wenn du es nicht sofort siehst. Bleib klar in deinen Grenzen, ohne dich für die Angst des anderen verantwortlich zu machen.',
    forB: 'Du bist bei einem Menschen, der bleibt. Übe, dich selbst zu beruhigen, statt jede Unsicherheit sofort außen zu lösen – so kann Vertrauen wachsen.',
    growth: 'Der ängstliche Part lernt Selbstberuhigung, der sichere Part bleibt liebevoll-klar statt rettend.',
  },
  {
    a: 'sicher', b: 'vermeidend', rating: 'gut',
    headline: 'Nähe ohne Enge',
    dynamic: 'Der sichere Part kann Freiraum geben, ohne sich abgelehnt zu fühlen – genau das, was der vermeidende Part braucht, um sich sicher genug für Nähe zu fühlen.',
    draw: 'Kein Klammern, kein Druck. Der vermeidende Part erlebt, dass Nähe nicht automatisch Vereinnahmung heißt.',
    friction: 'Der sichere Part wünscht sich mehr emotionale Offenheit, als anfangs kommt. Rückzug kann sich trotz Sicherheit einsam anfühlen.',
    forA: 'Nimm den Rückzug nicht persönlich, aber benenne freundlich, was du an Nähe brauchst. Deine Ruhe lädt den anderen ein, sich zu öffnen.',
    forB: 'Du hast Raum – nutze ihn, um in kleinen Schritten mehr zu zeigen. Kündige Rückzug an, statt zu verschwinden; das schafft Sicherheit für euch beide.',
    growth: 'Der vermeidende Part übt Zeigen in Sicherheit; der sichere Part bleibt geduldig einladend.',
  },
  {
    a: 'sicher', b: 'aengstlich_vermeidend', rating: 'gemischt',
    headline: 'Sicherheit trifft Widerspruch',
    dynamic: 'Der sichere Part bringt genau die ruhige Verlässlichkeit mit, die dem ängstlich-vermeidenden Part helfen kann – aber dessen Auf und Ab fordert viel Standfestigkeit.',
    draw: 'Vorhersehbarkeit und Geduld können alte Schutzmuster langsam entkräften. Der widersprüchliche Part fühlt sich zum ersten Mal vielleicht sicher genug, um zu bleiben.',
    friction: 'Das schnelle Kippen zwischen Klammern und Wegstoßen kann selbst ein stabiles Gegenüber erschöpfen und verunsichern.',
    forA: 'Bleib ruhig und berechenbar, ohne dich verbiegen zu lassen. Setz klare Grenzen – das ist kein Liebesentzug, sondern gibt Halt.',
    forB: 'Wenn der Wunsch nach Nähe kippt: benenne es, statt zu handeln. Fachliche Begleitung kann euch beiden viel Kraft ersparen.',
    growth: 'Ruhige Konstanz + (oft) therapeutische Unterstützung, um das Nähe-Alarm-Muster zu entschärfen.',
  },
  {
    a: 'aengstlich', b: 'aengstlich', rating: 'gemischt',
    headline: 'Zwei, die dranbleiben',
    dynamic: 'Beide brauchen viel Nähe und Rückversicherung. Das kann eine tiefe, warme Verbindung sein – oder sich zu einem gegenseitigen Hochschaukeln der Ängste steigern.',
    draw: 'Man versteht die Sehnsucht des anderen von innen. Niemand zieht sich einfach zurück – beide kämpfen für die Beziehung.',
    friction: 'Wenn beide gleichzeitig Angst haben, gibt es niemanden, der beruhigt. Kleine Auslöser können sich zu großen Krisen aufschaukeln.',
    forA: 'Lerne, dich selbst zu regulieren, bevor du Beruhigung einforderst – sonst braucht ihr beide gleichzeitig und keiner kann geben.',
    forB: 'Genauso: Ein kurzer eigener Anker (Atem, Pause, Realitätscheck) verhindert, dass sich eure Ängste gegenseitig anzünden.',
    growth: 'Beide üben Selbstberuhigung und klare, ruhige Bitten statt Protest – dann trägt die gemeinsame Wärme.',
  },
  {
    a: 'aengstlich', b: 'vermeidend', rating: 'herausfordernd',
    headline: 'Das Verfolger-Distanzierer-Paar',
    dynamic: 'Die klassische Falle: Je mehr der ängstliche Part Nähe sucht, desto mehr zieht sich der vermeidende Part zurück – was die Angst verstärkt, was den Rückzug verstärkt. Ein sich selbst nährender Kreislauf.',
    draw: 'Anfangs oft magnetisch: Der eine wirkt begehrenswert unabhängig, der andere herrlich zugewandt. Man ergänzt genau das, was man selbst vermisst.',
    friction: 'Genau diese Ergänzung wird zur Dynamik: Verfolgen und Fliehen. Beide fühlen sich unverstanden – der eine ungeliebt, der andere bedrängt.',
    forA: 'Erkenne den Kreislauf, statt schneller zu verfolgen. Rückzug des anderen ist meist Überforderung, nicht Ablehnung. Beruhige zuerst dich selbst.',
    forB: 'Rückzug verstärkt die Angst, die du vermeiden willst. Ein kleines „Ich bin gleich wieder da“ wirkt mehr als Verschwinden. Kündige Distanz an.',
    growth: 'Den Kreislauf sichtbar machen und gemeinsam durchbrechen – oft der wichtigste Schritt dieser Paarung. Bei Erschöpfung: Begleitung suchen.',
  },
  {
    a: 'aengstlich', b: 'aengstlich_vermeidend', rating: 'intensiv',
    headline: 'Sehnsucht trifft Widerspruch',
    dynamic: 'Der ängstliche Part sucht verlässliche Nähe – trifft aber auf einen Menschen, der Nähe zugleich sucht und fürchtet. Das kann sehr leidenschaftlich und sehr zermürbend zugleich sein.',
    draw: 'Emotionale Tiefe und Intensität auf beiden Seiten. Wenn es gut ist, fühlt es sich an wie eine Seelenverbindung.',
    friction: 'Das Kippen des einen Parts (heiß/kalt) trifft direkt in die Verlustangst des anderen. Höhen und Tiefen wechseln schnell, Stabilität ist schwer.',
    forA: 'Miss deinen Wert nicht am Auf und Ab des anderen. Du brauchst Verlässlichkeit – prüfe ehrlich, ob du sie bekommst.',
    forB: 'Dein Kippen erzeugt genau die Verlassenheitsangst, die auch dich quält. Benennen statt handeln – und Unterstützung annehmen.',
    growth: 'Viel Selbstberuhigung, klare Absprachen und (oft) fachliche Begleitung, damit Intensität nicht in Chaos umschlägt.',
  },
  {
    a: 'vermeidend', b: 'vermeidend', rating: 'gemischt',
    headline: 'Zwei Inseln',
    dynamic: 'Beide schätzen Autonomie und wollen niemanden vereinnahmen. Das kann angenehm konfliktarm sein – oder in einem höflichen Nebeneinander enden, in dem echte Nähe fehlt.',
    draw: 'Gegenseitiger Respekt für Freiraum. Kein Klammern, kein Druck – jede Person behält ihr Leben.',
    friction: 'Wenn beide bei Unbehagen dichtmachen, bleibt vieles ungesagt. Aus Freiheit wird leicht Distanz, aus Distanz Entfremdung.',
    forA: 'Freiraum ist eure Stärke – aber Nähe entsteht nicht von allein. Wag es, als Erster einen Schritt zu zeigen, auch wenn es ungewohnt ist.',
    forB: 'Warte nicht darauf, dass der andere anfängt. Kleine, bewusste Gesten der Nähe verhindern, dass ihr euch unbemerkt verliert.',
    growth: 'Bewusst Nähe verabreden, statt nur Freiheit zu leben – sonst driftet ihr auseinander, ohne dass jemand streitet.',
  },
  {
    a: 'vermeidend', b: 'aengstlich_vermeidend', rating: 'herausfordernd',
    headline: 'Rückzug trifft Widerspruch',
    dynamic: 'Trifft ein Mensch, der bei Nähe dichtmacht, auf einen, der Nähe sucht und fürchtet, ziehen sich oft beide zurück – während der widersprüchliche Part zugleich nach Verbindung hungert.',
    draw: 'Beide brauchen Freiraum und verstehen den Wunsch nach Rückzug. Kein aufdringliches Verfolgen.',
    friction: 'Der vermeidende Rückzug bestätigt die schlimmste Erwartung des ängstlich-vermeidenden Parts – und lässt ihn zwischen Klammern und Wegstoßen pendeln, ohne Halt.',
    forA: 'Dein Rückzug wird hier als Verlassen erlebt. Ein kleines Signal „Ich bin noch da, brauche kurz Raum“ verändert viel.',
    forB: 'Wenn du dich weder gehalten noch frei fühlst: benenne beides. Verlässliche kleine Kontakte helfen mehr als große Gesten.',
    growth: 'Rückzug ankündigen, Nähe in sicheren Dosen – bei Erschöpfung fachliche Begleitung. Ehrlich prüfen, ob genug Halt entsteht.',
  },
  {
    a: 'aengstlich_vermeidend', b: 'aengstlich_vermeidend', rating: 'intensiv',
    headline: 'Zwei Widersprüche',
    dynamic: 'Beide sehnen sich nach Nähe und fürchten sie zugleich. Das kann sich unglaublich verstehend anfühlen – und in ein heftiges gegenseitiges Anziehen und Wegstoßen kippen.',
    draw: 'Niemand versteht das Zerrissene besser als jemand, der es selbst kennt. Große Tiefe, große Intensität.',
    friction: 'Wenn beide gleichzeitig kippen, fehlt jeder stabile Anker. Höhen und Tiefen können extrem werden; Vertrauen bleibt fragil.',
    forA: 'Erkenne dein Muster, bevor du handelst. Du bist nicht deinem Alarm ausgeliefert – Pause vor Reaktion ist eure wichtigste Fähigkeit.',
    forB: 'Ihr könnt euch gegenseitig triggern oder gegenseitig halten. Gemeinsame Regeln für Krisen (und oft Begleitung) machen den Unterschied.',
    growth: 'Meist braucht es äußeren Halt – Therapie, klare Absprachen, Selbstberuhigung –, damit die Tiefe nicht im Chaos untergeht.',
  },
]

export function ratingFor(a: AttachType, b: AttachType): Pairing {
  const ia = ATTACH_ORDER.indexOf(a)
  const ib = ATTACH_ORDER.indexOf(b)
  const [x, y] = ia <= ib ? [a, b] : [b, a]
  return PAIRINGS.find((p) => p.a === x && p.b === y)!
}
