import {
    initializeBlock,
    useBase,
    Button,
    Heading,
    Box,
    FormField,
    TablePickerSynced,
    RecordPickerSynced,
} from '@airtable/blocks/ui';
import React, {useState} from 'react';
import './style.css';

function LoopTableApp() {
    // Phase 1 stub UI: select a template record and log config on Activate
    const base = useBase();
    const tables = base.tables;
    const [tableId, setTableId] = useState(tables.length ? tables[0].id : null);
    const [recordId, setRecordId] = useState(null);
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
            <Button
                variant="primary"
                onClick={() => console.log({tableId, recordId})}
            >
                Activate
            </Button>
        </Box>
    );
}

initializeBlock(() => <LoopTableApp />);
