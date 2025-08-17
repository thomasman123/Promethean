-- Link appointments to discoveries
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS linked_discovery_id UUID REFERENCES discoveries(id);
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS linked_appointment_id UUID REFERENCES appointments(id);

CREATE INDEX IF NOT EXISTS idx_appointments_linked_discovery_id ON appointments(linked_discovery_id);
CREATE INDEX IF NOT EXISTS idx_discoveries_linked_appointment_id ON discoveries(linked_appointment_id); 