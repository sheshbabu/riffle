import Badge from '../../commons/components/Badge.jsx';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../commons/components/Table.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';
import formatDuration from '../../commons/utils/formatDuration.js';

export default function ExportTable({ sessions, onSessionClick }) {
  if (sessions.length === 0) {
    return null;
  }

  const rows = sessions.map(session => (
    <ExportTableRow
      key={session.export_id}
      session={session}
      onClick={() => onSessionClick(session)}
    />
  ));

  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>Started</TableHeaderCell>
        <TableHeaderCell>Criteria</TableHeaderCell>
        <TableHeaderCell>Exported</TableHeaderCell>
        <TableHeaderCell>Errors</TableHeaderCell>
        <TableHeaderCell>Duration</TableHeaderCell>
        <TableHeaderCell>Status</TableHeaderCell>
      </TableHeader>
      <TableBody>
        {rows}
      </TableBody>
    </Table>
  );
}

function ExportTableRow({ session, onClick }) {
  const formattedDateTime = formatDateTime(session.started_at);
  const durationText = formatDuration(session.duration_seconds);

  let statusBadge = null;
  if (session.status === 'completed') {
    statusBadge = <Badge variant="success">Completed</Badge>;
  } else if (session.status === 'error') {
    statusBadge = <Badge variant="error">Error</Badge>;
  } else {
    statusBadge = <Badge variant="warning">Running</Badge>;
  }

  const errorCount = session.error_count > 0 ? session.error_count : '—';
  const duration = durationText || '—';

  let criteriaText = `Rating ≥ ${session.min_rating}`;
  if (session.curation_status) {
    criteriaText += session.curation_status === 'pick' ? ', Picked' : ', All';
  }

  let errorClass = '';
  if (session.error_count > 0) {
    errorClass = 'table-error';
  }

  return (
    <TableRow onClick={onClick}>
      <TableCell>{formattedDateTime}</TableCell>
      <TableCell>
        <Badge variant="neutral">{criteriaText}</Badge>
      </TableCell>
      <TableCell>{session.exported_photos}/{session.total_photos}</TableCell>
      <TableCell className={errorClass}>{errorCount}</TableCell>
      <TableCell>{duration}</TableCell>
      <TableCell>{statusBadge}</TableCell>
    </TableRow>
  );
}
