import './Table.css';

export function Table({ children }) {
  return (
    <div className="table-container">
      <table className="table">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }) {
  return (
    <thead>
      <tr>
        {children}
      </tr>
    </thead>
  );
}

export function TableHeaderCell({ children }) {
  return <th>{children}</th>;
}

export function TableBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ onClick, children }) {
  return (
    <tr onClick={onClick}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className }) {
  return <td className={className}>{children}</td>;
}
