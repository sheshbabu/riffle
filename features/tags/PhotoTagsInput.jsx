import ApiClient from '../../commons/http/ApiClient.js';
import { CircleMinus } from "../../commons/components/Icon.jsx"
import './PhotoTagsInput.css';

const { useState, useEffect, useRef } = React;

export default function PhotoTagsInput({ tags, onAddTag, onRemoveTag }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    async function loadSuggestions() {
      if (query.trim() === '') {
        setSuggestions([]);
        setIsDropdownOpen(false);
        return;
      }

      try {
        const allTags = await ApiClient.getTags(query);
        const existingTagIds = new Set(tags.map(t => t.tagId));
        const filteredTags = allTags.filter(t => !existingTagIds.has(t.tagId));
        setSuggestions(filteredTags);
        setIsDropdownOpen(filteredTags.length > 0 || query.trim() !== '');
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Failed to load tag suggestions:', err);
      }
    }

    loadSuggestions();
  }, [query, tags]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleInputChange(e) {
    setQuery(e.target.value);
  }

  function handleKeyDown(e) {
    if (!isDropdownOpen) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = suggestions.length;
      setSelectedIndex(prev => (prev < maxIndex - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === -1) {
        handleAddNewTag();
      } else if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectTag(suggestions[selectedIndex]);
      } else {
        handleAddNewTag();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
      setQuery('');
    }
  }

  function handleSelectTag(tag) {
    onAddTag(tag);
    setQuery('');
    setIsDropdownOpen(false);
    setSuggestions([]);
  }

  function handleAddNewTag() {
    const trimmedQuery = query.trim();
    if (trimmedQuery === '') {
      return;
    }

    const existingTag = suggestions.find(t => t.name.toLowerCase() === trimmedQuery.toLowerCase());
    if (existingTag) {
      handleSelectTag(existingTag);
    } else {
      onAddTag({ tagId: -1, name: trimmedQuery });
      setQuery('');
      setIsDropdownOpen(false);
      setSuggestions([]);
    }
  }

  const tagBadges = tags.map(tag => {
    return (
      <div key={tag.tagId} className="tag-badge">
        <span className="tag-badge-name">{tag.name}</span>
        <span onClick={() => onRemoveTag(tag)}><CircleMinus /></span>
      </div>
    );
  });

  let dropdownContent = null;
  if (isDropdownOpen && query.trim() !== '') {
    const suggestionItems = suggestions.map((tag, index) => (
      <div
        key={tag.tagId}
        className={`tag-suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
        onClick={() => handleSelectTag(tag)}
      >
        {tag.name}
      </div>
    ));

    const addNewItem = (
      <div
        key="add-new"
        className={`tag-suggestion-item add-new ${selectedIndex === suggestions.length ? 'selected' : ''}`}
        onClick={handleAddNewTag}
      >
        Add "{query.trim()}"
      </div>
    );

    dropdownContent = (
      <div className="tag-suggestions-dropdown" ref={dropdownRef}>
        {suggestionItems}
        {addNewItem}
      </div>
    );
  }

  return (
    <div className="photo-tags-input">
      <div className="tag-badges-container">
        {tagBadges}
        <input ref={inputRef} type="text" className="tag-input" placeholder="Add tags..." value={query} onChange={handleInputChange} onKeyDown={handleKeyDown} />
      </div>
      {dropdownContent}
    </div>
  );
}
