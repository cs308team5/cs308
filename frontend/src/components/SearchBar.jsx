import "./SearchBar.css";

export default function SearchBar({ onSearch, value = "", placeholder = "Search products..." }) {
  return (
    <div className="search-container">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onSearch(e.target.value)}
        className="search-input"
      />
    </div>
  );
}
