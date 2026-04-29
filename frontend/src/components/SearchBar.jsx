import "./SearchBar.css";
import { useId } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";

export default function SearchBar({
  value = "",
  onSearch,
  onSubmit,
  suggestions = [],
  placeholder = "Search products...",
  className = "",
}) {
  const suggestionListId = useId();

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(value.trim());
  };

  return (
    <>
      <form className={`search-container ${className}`.trim()} onSubmit={handleSubmit}>
        <button type="submit" className="search-icon-btn" aria-label="Search">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </button>

        <input
          type="text"
          value={value}
          list={suggestions.length ? suggestionListId : undefined}
          placeholder={placeholder}
          onChange={(event) => onSearch?.(event.target.value)}
          className="search-input"
        />

        {value && (
          <button
            type="button"
            className="search-clear-btn"
            aria-label="Clear search"
            onClick={() => onSearch?.("")}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
      </form>

      {suggestions.length > 0 && (
        <datalist id={suggestionListId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
    </>
  );
}
