import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const phrase = "The quick brown fox jumps over the lazy dog";

function Flashcard({ phrase }) {
  const [selected, setSelected] = useState([]);
  const words = phrase.split(" ");

  const toggleWord = (idx) => {
    setSelected((prev) =>
      prev.includes(idx)
        ? prev.filter((i) => i !== idx)
        : [...prev, idx]
    );
  };

  return (
    <div className="flashcard">
      {words.map((word, idx) => (
        <span
          key={idx}
          className={`word${selected.includes(idx) ? " selected" : ""}`}
          onClick={() => toggleWord(idx)}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<Flashcard phrase={phrase} />);
