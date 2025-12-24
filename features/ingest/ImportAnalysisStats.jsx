import './ImportAnalysisStats.css';

export default function ImportAnalysisStats({ stats }) {
  return (
    <div className="import-analysis-stats">
      <h3>Summary</h3>
      <table className="stats-table">
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
          <tr>
            <td>Duplicates removed:</td>
            <td>{stats.duplicatesRemoved}</td>
          </tr>
          <tr>
            <td>Files moved to library:</td>
            <td>{stats.movedToLibrary}</td>
          </tr>
          <tr>
            <td>Files moved to trash:</td>
            <td>{stats.movedToTrash}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
