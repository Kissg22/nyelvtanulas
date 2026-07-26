{tokenizeSentence(sentence.source_text).map((token,i)=>
  isWordToken(token) ? (
    <span
      key={`${sentence.id}-${i}`}
      className={`word ${saved.has(normalizeWord(token)) ? 'saved' : ''}`}
      onMouseEnter={() => setHoveredWord({ word: token, sentence })}
      onMouseLeave={() =>
        setHoveredWord(current =>
          current?.word === token && current.sentence.id === sentence.id
            ? null
            : current
        )
      }
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => {
        e.preventDefault();
        e.stopPropagation();
        void openWord(token, sentence, true);
      }}
    >
      {token}

      {wordPopup?.word === token &&
        wordPopup.sentence.id === sentence.id && (
          <span
            className="word-popup word-popup-v3"
            onClick={e => e.stopPropagation()}
          >
            <span className="translation-label dark">
              MAGYARUL
            </span>

            <b>
              {wordPopup.loading
                ? 'Fordítás…'
                : wordPopup.translation || 'Nincs fordítás.'}
            </b>

            <small>
              {token} · 🔊 kiejtés
            </small>
          </span>
        )}
    </span>
  ) : (
    <span key={`${sentence.id}-${i}`}>
      {token}
    </span>
  )
)}{' '}
