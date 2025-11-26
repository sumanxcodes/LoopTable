import React, {useState} from 'react';
import {
  initializeBlock,
  useBase,
  Button,
  Heading,
  Box,
  FormField,
  TablePickerSynced,
  RecordPickerSynced,
  Input,
  Textarea,
  Text,
} from '@airtable/blocks/ui';
import './style.css';

function LoopTableApp() {
    // Phase 1 stub UI: select a template record and log config on Activate
    const base = useBase();
    const tables = base.tables;
    const [tableId, setTableId] = useState(tables.length ? tables[0].id : null);
    const [recordId, setRecordId] = useState(null);
    const [cronExpression, setCronExpression] = useState('0 9 * * *');
    const [fieldConfigJson, setFieldConfigJson] = useState('{}');
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    async function handleActivate() {
        let fieldConfig;
        try {
            fieldConfig = JSON.parse(fieldConfigJson);
        } catch (err) {
            console.error('Invalid JSON for Field Config');
            return;
        }
        const payload = { tableId, recordId, cronExpression, timezone, fieldConfig };
        try {
            const resp = await fetch('http://localhost:3000/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            console.log('Schedule created:', data);
        } catch (err) {
            console.error('Schedule creation failed:', err);
        }
    }

    return (
        <Box padding={3} display="flex" flexDirection="column" gap={3}>
            <Heading>LoopTable Configuration (MVP)</Heading>
            <FormField label="Select table">
                <TablePickerSynced
                    table={base.getTableByIdIfExists(tableId)}
                    onChange={table => setTableId(table.id)}
                />
            </FormField>
            <FormField label="Select template record">
                <RecordPickerSynced
                    table={base.getTableByIdIfExists(tableId)}
                    recordId={recordId}
                    onChange={id => setRecordId(id)}
                />
            </FormField>
            <FormField label="Cron Expression">
                <Input
                    value={cronExpression}
                    onChange={e => setCronExpression(e.target.value)}
                />
            </FormField>
            <FormField label="Field Config (JSON)">
                <Textarea
                    value={fieldConfigJson}
                    onChange={e => setFieldConfigJson(e.target.value)}
                />
            </FormField>
            <FormField label="Timezone">
                <Text>{timezone}</Text>
            </FormField>
            <Button variant="primary" onClick={handleActivate}>
                Activate
            </Button>
        </Box>
    );
}

initializeBlock(() => <LoopTableApp />);
