import { PencilIcon } from '../../commons/components/Icon.jsx';
import TagDetailModal from './TagDetailModal.jsx';
import ApiClient from '../../commons/http/ApiClient.js';

const { useState, useEffect, useCallback } = React;

export default function SidebarTagsList() {
  const [tags, setTags] = useState([]);
  const [editingTag, setEditingTag] = useState(null);

  const loadTags = useCallback(async function () {
    try {
      const allTags = await ApiClient.getTags();
      setTags(allTags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  function handleEditClick(tag, e) {
    e.preventDefault();
    e.stopPropagation();
    setEditingTag(tag);
  }

  function handleCloseModal() {
    setEditingTag(null);
  }

  function handleUpdate() {
    loadTags();
  }

  function handleDelete() {
    loadTags();
  }

  if (tags.length === 0) {
    return null;
  }

  const items = tags.map(tag => (
    <a key={tag.tagId} className="sidebar-tag-item" href={`/library?tagId=${tag.tagId}`}>
      <span className="sidebar-tag-name">{tag.name}</span>
      <span className="sidebar-tag-count">{tag.photoCount}</span>
      <button className="sidebar-tag-edit" onClick={(e) => handleEditClick(tag, e)} title="Edit tag">
        <PencilIcon />
      </button>
    </a>
  ));

  let modal = null;
  if (editingTag) {
    modal = (
      <TagDetailModal
        tag={editingTag}
        onClose={handleCloseModal}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <>
      <div className="sidebar-section-title">Tags</div>
      <div className="sidebar-tags-list">
        {items}
      </div>
      {modal}
    </>
  );
}
