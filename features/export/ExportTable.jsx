import Badge from '../../commons/components/Badge.jsx';
import StatusBadge from '../../commons/components/StatusBadge.jsx';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../commons/components/Table.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';
import formatDuration from '../../commons/utils/formatDuration.js';

export default function ExportTable({ sessions, onSessionClick }) {
  if (sessions.length === 0) {
    return null;
  }

  const rows = sessions.map(session => (
    <ExportTableRow
      key={session.exportId}
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
  const formattedDateTime = formatDateTime(session.startedAt);
  const durationText = formatDuration(session.durationSeconds);

  const errorCount = session.errorCount > 0 ? session.errorCount : '—';
  const duration = durationText || '—';

  let criteriaText = `Rating ≥ ${session.minRating}`;
  if (session.curationStatus) {
    criteriaText += session.curationStatus === 'pick' ? ', Picked only' : ', All photos';
  }

  let errorClass = '';
  if (session.errorCount > 0) {
    errorClass = 'table-error';
  }

  return (
    <TableRow onClick={onClick}>
      <TableCell>{formattedDateTime}</TableCell>
      <TableCell>
        <Badge variant="neutral">{criteriaText}</Badge>
      </TableCell>
      <TableCell>{session.exportedPhotos}/{session.totalPhotos}</TableCell>
      <TableCell className={errorClass}>{errorCount}</TableCell>
      <TableCell>{duration}</TableCell>
      <TableCell>
        <StatusBadge status={session.status} />
      </TableCell>
    </TableRow>
  );
}
