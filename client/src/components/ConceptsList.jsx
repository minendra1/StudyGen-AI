import '../styles/StudyCard.css';

export default function ConceptsList({ concepts }) {
  const items = Array.isArray(concepts) ? concepts : [];

  return (
    <section className="card concepts-card" aria-labelledby="concepts-heading">
      <div className="section-header">
        <h3 id="concepts-heading" className="section-title">
          Key Concepts
        </h3>
        <span className="section-count">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="empty-section-text">No key concepts were provided for this topic.</p>
      ) : (
        <ul className="concepts-grid">
          {items.map((concept, index) => (
            <li key={`${concept.term}-${index}`} className="concept-item">
              <h4 className="concept-term">{concept.term}</h4>
              <p className="concept-definition">{concept.definition}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

