import React, { useState } from "react";
import { SearchIcon } from "../components/Icons/Icons";
import "./NameSearchBar.css";

export default function NameSearchBar({ label, onSearch, loading = false }: {
  label: string; onSearch: (name: string) => void; loading?: boolean;
}) {
  const [name, setName] = useState("");
  return (
    <div className="name-search-bar" role="search" aria-label={label} aria-busy={loading}>
      <label className="name-search-field">
        <span className="name-search-sr-only">{label}</span>
        <SearchIcon size={19} className="name-search-icon" />
        <input type="search" aria-label={label} placeholder={label}
          value={name} onChange={(event) => {
            const value = event.target.value;
            setName(value);
            onSearch(value.trim());
          }} />
        {loading && <span className="name-search-status" role="status">
          <span className="name-search-sr-only">Loading results...</span>
        </span>}
      </label>
    </div>
  );
}
