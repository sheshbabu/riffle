import './ScanResultsCard.css';

export default function ScanResultsCard({ stats }) {
  return (
    <div className="scan-results-card">
      <h3>Scan Results</h3>
      <table className="results-table">
        <tbody>
          <tr>
            <td>Total files scanned:</td>
            <td>{stats.totalScanned}</td>
          </tr>
          <tr>
            <td>Unique files:</td>
            <td>{stats.uniqueFiles}</td>
          </tr>
          <tr>
            <td>Duplicate groups found:</td>
            <td>{stats.duplicateGroups}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
