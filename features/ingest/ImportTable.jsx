import Badge from '../../commons/components/Badge.jsx';
import StatusBadge from '../../commons/components/StatusBadge.jsx';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../commons/components/Table.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';
import formatDuration from '../../commons/utils/formatDuration.js';

export default function ImportTable({ sessions, onSessionClick }) {
  if (sessions.length === 0) {
    return null;
  }

  const rows = sessions.map(session => (
    <ImportTableRow
      key={session.importId}
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
  const formattedDateTime = formatDateTime(session.startedAt);
  const durationText = formatDuration(session.durationSeconds);

  const alreadyImportedCount = session.alreadyImported > 0 ? session.alreadyImported : '—';
  const duplicateGroupsCount = session.duplicateGroups > 0 ? session.duplicateGroups : '—';
  const errorCount = session.errorCount > 0 ? session.errorCount : '—';
  const duration = durationText || '—';

  let errorClass = '';
  if (session.errorCount > 0) {
    errorClass = 'table-error';
  }

  return (
    <TableRow onClick={onClick}>
      <TableCell>{formattedDateTime}</TableCell>
      <TableCell>
        <Badge variant="neutral">{session.importMode}</Badge>
      </TableCell>
      <TableCell>{session.movedToLibrary}/{session.totalScanned}</TableCell>
      <TableCell>{alreadyImportedCount}</TableCell>
      <TableCell>{duplicateGroupsCount}</TableCell>
      <TableCell className={errorClass}>{errorCount}</TableCell>
      <TableCell>{duration}</TableCell>
      <TableCell>
        <StatusBadge status={session.status} />
      </TableCell>
    </TableRow>
  );
}
