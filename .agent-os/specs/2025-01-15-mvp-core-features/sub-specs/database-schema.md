# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-01-15-mvp-core-features/spec.md

> Created: 2025-01-15
> Version: 1.0.0

## Schema Overview

The database will use Supabase (PostgreSQL) with three main tables: events, guests, and rsvp_responses. We'll use UUIDs for primary keys and implement proper foreign key relationships.

## Tables

### 1. events

Stores event information created by organizers.

```sql
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME,
  location TEXT,
  description TEXT,
  organizer_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Index for faster queries
CREATE INDEX idx_events_organizer_email ON events(organizer_email);
CREATE INDEX idx_events_date ON events(date);
```

### 2. guests

Stores guest information for each event.

```sql
CREATE TABLE guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  token VARCHAR(255) UNIQUE NOT NULL,
  max_guests INTEGER DEFAULT 1 CHECK (max_guests >= 1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(event_id, email)
);

-- Indexes for performance
CREATE INDEX idx_guests_event_id ON guests(event_id);
CREATE INDEX idx_guests_token ON guests(token);
CREATE INDEX idx_guests_email ON guests(email);
```

### 3. rsvp_responses

Stores RSVP responses from guests.

```sql
CREATE TABLE rsvp_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('yes', 'no', 'maybe', 'pending')),
  responded_at TIMESTAMP WITH TIME ZONE,
  num_of_guests INTEGER DEFAULT 1 CHECK (num_of_guests >= 0),
  guest_names TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(guest_id)
);

-- Index for faster status queries
CREATE INDEX idx_rsvp_responses_guest_id ON rsvp_responses(guest_id);
CREATE INDEX idx_rsvp_responses_status ON rsvp_responses(status);
```

## Row Level Security (RLS) Policies

Enable RLS for all tables to ensure data security:

```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Public can view events by ID" ON events
  FOR SELECT USING (true);

CREATE POLICY "Organizers can manage their events" ON events
  FOR ALL USING (auth.jwt() ->> 'email' = organizer_email);

-- Guests policies
CREATE POLICY "Guests can view themselves by token" ON guests
  FOR SELECT USING (token = current_setting('app.current_token', true));

CREATE POLICY "Event organizers can manage guests" ON guests
  FOR ALL USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_email = auth.jwt() ->> 'email'
    )
  );

-- RSVP responses policies
CREATE POLICY "Guests can manage their own responses" ON rsvp_responses
  FOR ALL USING (
    guest_id IN (
      SELECT id FROM guests WHERE token = current_setting('app.current_token', true)
    )
  );

CREATE POLICY "Organizers can view responses" ON rsvp_responses
  FOR SELECT USING (
    guest_id IN (
      SELECT g.id FROM guests g
      JOIN events e ON g.event_id = e.id
      WHERE e.organizer_email = auth.jwt() ->> 'email'
    )
  );
```

## Database Functions

### Update timestamp trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvp_responses_updated_at BEFORE UPDATE ON rsvp_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Get event statistics

```sql
CREATE OR REPLACE FUNCTION get_event_statistics(event_id_param UUID)
RETURNS TABLE (
  total_invited INTEGER,
  total_responded INTEGER,
  total_yes INTEGER,
  total_no INTEGER,
  total_maybe INTEGER,
  total_pending INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT g.id)::INTEGER as total_invited,
    COUNT(DISTINCT r.id)::INTEGER as total_responded,
    COUNT(DISTINCT CASE WHEN r.status = 'yes' THEN r.id END)::INTEGER as total_yes,
    COUNT(DISTINCT CASE WHEN r.status = 'no' THEN r.id END)::INTEGER as total_no,
    COUNT(DISTINCT CASE WHEN r.status = 'maybe' THEN r.id END)::INTEGER as total_maybe,
    COUNT(DISTINCT CASE WHEN r.status = 'pending' OR r.status IS NULL THEN g.id END)::INTEGER as total_pending
  FROM guests g
  LEFT JOIN rsvp_responses r ON g.id = r.guest_id
  WHERE g.event_id = event_id_param;
END;
$$ LANGUAGE plpgsql;
```

## Migration Strategy

1. Create tables in order: events → guests → rsvp_responses
2. Apply RLS policies after tables are created
3. Create indexes for performance optimization
4. Add database functions and triggers
5. Seed with test data in development environment

## Data Integrity Rules

- Event deletion cascades to guests and their responses
- Guest deletion cascades to their RSVP responses
- Each guest can only have one response per event
- Guest tokens must be unique across the entire system
- Email must be unique per event (no duplicate guests)
- RSVP status is constrained to valid values only
- num_of_guests in response cannot exceed max_guests allowed for the guest
- num_of_guests must be 0 or positive integer

## Performance Considerations

- Indexes on foreign keys for JOIN operations
- Index on guest tokens for fast lookup via RSVP links
- Index on event dates for chronological queries
- Index on RSVP status for statistics calculations
- Updated_at triggers for automatic timestamp management