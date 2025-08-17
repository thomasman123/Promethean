-- Fix foreign key behavior to allow safe deletes by nulling references
-- Dials -> Appointments
ALTER TABLE dials DROP CONSTRAINT IF EXISTS dials_booked_appointment_id_fkey;
ALTER TABLE dials ADD CONSTRAINT dials_booked_appointment_id_fkey
  FOREIGN KEY (booked_appointment_id)
  REFERENCES appointments(id)
  ON DELETE SET NULL;

-- Appointments -> Discoveries
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_linked_discovery_id_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_linked_discovery_id_fkey
  FOREIGN KEY (linked_discovery_id)
  REFERENCES discoveries(id)
  ON DELETE SET NULL;

-- Discoveries -> Appointments
ALTER TABLE discoveries DROP CONSTRAINT IF EXISTS discoveries_linked_appointment_id_fkey;
ALTER TABLE discoveries ADD CONSTRAINT discoveries_linked_appointment_id_fkey
  FOREIGN KEY (linked_appointment_id)
  REFERENCES appointments(id)
  ON DELETE SET NULL; 