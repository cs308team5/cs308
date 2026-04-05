import "./SearchBar.css";

export default function SearchBar({ onSearch }) {
  return (
    <div className="search-container">
      <input
        type="text"
        placeholder="Search products..."
        onChange={(e) => onSearch(e.target.value)}
        className="search-input"
      />
    </div>
  );
}