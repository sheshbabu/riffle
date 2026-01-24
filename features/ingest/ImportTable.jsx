import Badge from '../../commons/components/Badge.jsx';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../commons/components/Table.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';
import formatDuration from '../../commons/utils/formatDuration.js';

export default function ImportTable({ sessions, onSessionClick }) {
  if (sessions.length === 0) {
    return null;
  }

  const rows = sessions.map(session => (
    <ImportTableRow
      key={session.import_id}
      session={session}
      onClick={() => onSessionClick(session)}
    />
  ));

  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>Started</TableHeaderCell>
        <TableHeaderCell>Mode</TableHeaderCell>
        <TableHeaderCell>Imported</TableHeaderCell>
        <TableHeaderCell>Already Imported</TableHeaderCell>
        <TableHeaderCell>Duplicates</TableHeaderCell>
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

function ImportTableRow({ session, onClick }) {
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

  const alreadyImportedCount = session.already_imported > 0 ? session.already_imported : '—';
  const duplicateGroupsCount = session.duplicate_groups > 0 ? session.duplicate_groups : '—';
  const errorCount = session.error_count > 0 ? session.error_count : '—';
  const duration = durationText || '—';

  let errorClass = '';
  if (session.error_count > 0) {
    errorClass = 'table-error';
  }

  return (
    <TableRow onClick={onClick}>
      <TableCell>{formattedDateTime}</TableCell>
      <TableCell>
        <Badge variant="neutral">{session.import_mode}</Badge>
      </TableCell>
      <TableCell>{session.moved_to_library}/{session.total_scanned}</TableCell>
      <TableCell>{alreadyImportedCount}</TableCell>
      <TableCell>{duplicateGroupsCount}</TableCell>
      <TableCell className={errorClass}>{errorCount}</TableCell>
      <TableCell>{duration}</TableCell>
      <TableCell>{statusBadge}</TableCell>
    </TableRow>
  );
}
