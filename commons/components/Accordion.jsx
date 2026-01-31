import { ChevronDownIcon, ChevronUpIcon } from './Icon.jsx';
import './Accordion.css';

const { useState, createContext, useContext } = React;

const AccordionContext = createContext();

export function Accordion({ children, defaultOpen = [], className = '' }) {
  const [openItems, setOpenItems] = useState(new Set(defaultOpen));

  function toggleItem(value) {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  }

  const classes = `accordion ${className}`.trim();

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className={classes}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ value, title, children, className = '' }) {
  const { openItems, toggleItem } = useContext(AccordionContext);
  const isOpen = openItems.has(value);
  const chevronIcon = isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />;

  const classes = `accordion-item ${className}`.trim();

  let content = null;
  if (isOpen) {
    content = <div className="accordion-content">{children}</div>;
  }

  return (
    <div className={classes}>
      <div className="accordion-header" onClick={() => toggleItem(value)}>
        <span className="accordion-title">{title}</span>
        {chevronIcon}
      </div>
      {content}
    </div>
  );
}
