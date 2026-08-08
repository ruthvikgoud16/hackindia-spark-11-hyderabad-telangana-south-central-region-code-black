import { useEffect, useState } from "react";
import "./wandering-pets.css";

/** Spider-Man hangs from the New inquiry button — greets, then swings. */
export function SpideyFromQuery({ visible = true }: { visible?: boolean }) {
  const [greet, setGreet] = useState(true);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    setGreet(true);
    const t = setTimeout(() => setGreet(false), 4500);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className={`spidey-from-query ${reduce ? "is-static" : ""}`} aria-hidden>
      {greet ? (
        <div className="spidey-bubble" role="status">
          Hi, how are you!
        </div>
      ) : null}

      <div className={`spidey-swing ${greet ? "is-greet" : "is-play"}`}>
        <img
          src="/spiderman.png"
          alt=""
          className="spidey-img"
          draggable={false}
        />
      </div>
    </div>
  );
}

/** @deprecated name kept so ChatPage import stays stable if needed */
export function WanderingPets() {
  return null;
}
