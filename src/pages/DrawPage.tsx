import React from "react";
import "./DrawPage.css";

export default function DrawPage() {
  const onTickerClick = () => {
    // TODO: change to your target (route or external URL)
    // Example: window.location.href = "/lachtrainer";
  };

  return (
    <div className="drawpage-root">
      <div className="ticker-wrapper">
        <div className="ticker" onClick={onTickerClick} role="button" tabIndex={0}>
          <span>Startet im Februar: Ausbildung zum Lachtrainer - Mehr Infos😊</span>
          <span>Startet im Februar: Ausbildung zum Lachtrainer - Mehr Infos😊</span>
          <span>Startet im Februar: Ausbildung zum Lachtrainer - Mehr Infos😊</span>
          <span>Startet im Februar: Ausbildung zum Lachtrainer - Mehr Infos😊</span>
        </div>
      </div>

      <div className="text-block">
        <span className="first-line">
          <span className="cta-big-lime">Newsletter</span>😊
          <span className="cta-big-blue">Tel.</span>☎️
          <span className="cta-big-violet">E-Mail</span> ✉️{" "}
        </span>

        <span className="title">🤩Speaking:</span>
        {" "}
        Keynotes und Impulse. Das Auditorium als Spielwiese der Freude – Raum zum
        Staunen, Spüren und Mit-dem-Herzen-Denken. Mit Tiefgang – und einem leisen
        Augenzwinkern.
        {" "}

        <span className="title">😉😉 Mentoring:</span>
        {" "}
        Sich selbst leicht nehmen, auch wenn das Leben gerade schwer ist. Hier bist
        du richtig, wenn das Leben gerade ruckelt – beruflich, privat oder irgendwo
        dazwischen. Was immer es ist – ich bin genau einen Anruf oder eine Nachricht
        entfernt.
        {" "}

        <span className="title">🤩 Training:</span>
        {" "}
        Strukturierte Trainings, Workshops und Teamevents – von kompakt bis mehrtägig.
        Leichtfüßige Entwicklungsräume für neue Perspektiven, gemeinsame Ausrichtung
        und wirksame Zusammenarbeit.
        {" "}

        <span className="cta-linkedin">Linkedin</span>
        <span className="cta-big-brown">Trainerprofil</span>
        <span className="cta-insta">Instagram</span>
        <span className="cta-fb">FB</span>
        <span className="cta-daten">Datenschutz &amp; Impressum</span>
      </div>
    </div>
  );
}
