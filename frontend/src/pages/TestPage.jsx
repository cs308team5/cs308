import { useState, useEffect } from "react";
import SearchBar from "../components/SearchBar";

export default function TestPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    console.log("FETCHING:", query);
    const delay = setTimeout(async () => {
      if (!query) {
        setResults([]);
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:3000/api/products/search?q=${query}`
        );
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error(err);
      }
    }, 300); // debounce

    return () => clearTimeout(delay);
  }, [query]);

  return (
    <div style={{ padding: "40px", color: "white" }}>
      <h2>Search Bar Test</h2>

      <SearchBar onSearch={setQuery} />

      <div style={{ marginTop: "20px" }}>
        {results.length === 0 && query && <p>No results found</p>}

        {results.map((p) => (
          <div key={p.id} style={{ marginBottom: "10px" }}>
            <strong>{p.name}</strong> - ${p.price}
          </div>
        ))}
      </div>
    </div>
  );
}