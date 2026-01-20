import './MessageBox.css';

export default function MessageBox({ children, variant = 'info' }) {
  const classes = ['message-box', variant].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
}
